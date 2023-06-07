import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { validate as isUUID} from 'uuid';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductImage } from './entities/product-image.entity';
@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource
  ) {

  }
  async create(createProductDto: CreateProductDto) {
    try {
      const { images = [], ...productDetails } = createProductDto;
      const product = this.productRepository.create({
        ...productDetails,
        images: images.map(image => this.productImageRepository.create({url: image}))
      });
      await this.productRepository.save(product);
      return {...product, images: images};
    } catch (error) {
      this.handleDbExceptions(error);

    }

  }

  async findAll(paginationDto: PaginationDto): Promise<any> {
    try {
      const { limit=10, offset = 0 } = paginationDto;
      const products = await this.productRepository.find({
        take: limit,
        skip: offset,
        relations: {
          images: true
        }
      })

      const response = products.map( product => ({
        ...product,
        images: product.images.map(image => image.url)
      }))

      return response
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findOne(term: string) {
    let product: Product;
    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({id: term});
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod');
      product = await queryBuilder.where('UPPER(title)=:title or slug =:slug', {
        title: term.toUpperCase(),
        slug: term.toLowerCase()
      })
      .leftJoinAndSelect("prod.images", 'prodImages')
      .getOne();
    }
      if (!product) {
        throw new NotFoundException(`Product with ${term} not found`);
      }
      return product;
  }

  async findOnePlane( term : string) {
    const product = await this.findOne(term)
    return {
      ...product,
      images: product.images.map(image => image.url)
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const { images, ...toUpdate} = updateProductDto

    const product = await this.productRepository.preload({
      id: id,
      ...toUpdate,
    });
    if (!product) {
      throw new NotFoundException(`product with id ${id} not found`)
    }

    // create query runner
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: {id}})

        product.images = images.map( image =>
          this.productImageRepository.create({url: image})
        )
      }

      await queryRunner.manager.save(product)
      await queryRunner.commitTransaction()
      await queryRunner.release()

      return this.findOnePlane(id)
    } catch (error) {
      await queryRunner.rollbackTransaction()
      await queryRunner.release()

      this.handleDbExceptions(error);
    }
  }

  private handleDbExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs.')
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product')

    try {
      return await query
        .delete()
        .where({})
        .execute()
    } catch (error) {
      this.handleDbExceptions(error)
    }
  }
}
