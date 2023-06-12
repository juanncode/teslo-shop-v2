import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, SetMetadata } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from './decorators/get-user.decorator';
import { User } from './entities/user.entity';
import { RawHeaders } from './decorators/raw-headers.decorator';
import { UserRoleGuard } from './guards/user-role/user-role.guard';
import { RoleProtected } from './decorators/role-protected.decorator';
import { ValidRoles } from './interfaces/valid-roles';
import { Auth } from './decorators/auth.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Post('login')
  loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }
  
  @Get('private')
  @UseGuards(AuthGuard())
  testingPrivateRoute(
    @GetUser() user: User,
    @GetUser('email') emailUser: string,
    @RawHeaders() rawHeaders: string[]
  ) {
    console.log(user);
    
    return {
      ok: true,
      message: 'Hola mundo private',
      user, 
      emailUser,
      rawHeaders
    }
  }
  // @SetMetadata('roles',['admin', 'super-admin'])

  @Get('private2')
  @RoleProtected(ValidRoles.superUser)
  @UseGuards(AuthGuard(), UserRoleGuard)
  testingPrivateRoute2(
    @GetUser() user: User
  ) {
    console.log(user);
    
    return {
      ok: true,
      message: 'Hola mundo private',
      user
    }
  }

  @Get('private3')
  @Auth(ValidRoles.admin)
  testingPrivateRoute3(
    @GetUser() user: User
  ) {
    console.log(user);
    
    return {
      ok: true,
      message: 'Hola mundo private',
      user
    }
  }
}
