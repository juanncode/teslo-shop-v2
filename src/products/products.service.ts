import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { validate as isUUID} from 'uuid';
import { UpdateProductDto } from './dto/update-product.dto';
@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>
  ) {

  }
  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto);
      await this.productRepository.save(product);
      return product;
    } catch (error) {
      this.handleDbExceptions(error);

    }

  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const { limit=10, offset = 0 } = paginationDto;
      return await this.productRepository.find({
        take: limit,
        skip: offset
      })
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findOne(term: string) {
    let product: Product;
    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({id: term});
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder.where('UPPER(title)=:title or slug =:slug', {
        title: term.toUpperCase(),
        slug: term.toLowerCase()
      }).getOne();
    }
      if (!product) {
        throw new NotFoundException(`Product with ${term} not found`);
      }
      return product;
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({
      id: id,
      ...updateProductDto
    });
    if (!product) {
      throw new NotFoundException(`product with id ${id} not found`)
    }
    
    try {
      await this.productRepository.save(product)
      return product;
    } catch (error) {
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
}
