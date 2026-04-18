import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MapService, EventMarker } from './map.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { Public } from '../../common/decorators/public.decorater';

@ApiTags('Map')
@Controller('map')
@UseGuards(JwtAuthGuard)
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Public()
  @Get('markers')
  @ApiOperation({
    summary: 'Lấy tất cả event markers cho bản đồ',
    description: 'Trả về danh sách các sự kiện với tọa độ để hiển thị trên Leaflet map',
  })
  async getMarkers(): Promise<{ success: true; data: EventMarker[] }> {
    const data = await this.mapService.getEventMarkers();
    return { success: true, data };
  }

  @Public()
  @Get('markers/:id')
  @ApiOperation({
    summary: 'Lấy chi tiết một event marker',
    description: 'Trả về thông tin chi tiết của một sự kiện theo ID',
  })
  @ApiParam({ name: 'id', description: 'Event ID' })
  async getMarkerById(
    @Param('id') id: string,
  ): Promise<{ success: true; data: EventMarker | null }> {
    const data = await this.mapService.getEventMarkerById(id);
    return { success: true, data };
  }

  @Public()
  @Get('nearby')
  @ApiOperation({
    summary: 'Tìm sự kiện gần một vị trí',
    description: 'Tìm các sự kiện trong bán kính (km) từ vị trí đã cho',
  })
  @ApiQuery({ name: 'lat', type: Number, description: 'Vĩ độ' })
  @ApiQuery({ name: 'lng', type: Number, description: 'Kinh độ' })
  @ApiQuery({
    name: 'radius',
    type: Number,
    required: false,
    description: 'Bán kính tìm kiếm (km), mặc định 10km',
  })
  async getNearbyEvents(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ): Promise<{ success: true; data: EventMarker[] }> {
    const data = await this.mapService.getNearbyEvents(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : 10,
    );
    return { success: true, data };
  }
}
