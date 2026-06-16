import { Type } from 'class-transformer';
import { IsArray, IsIn, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export const ANALYSIS_KINDS = ['SWOT', 'PESTLE', 'COMPETITOR', 'OTHER'] as const;

export class ChatTurnDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(6000)
  content!: string;
}

export class MarketAnalysisChatDto {
  @IsOptional()
  @IsIn(ANALYSIS_KINDS as unknown as string[])
  kind?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  messages!: ChatTurnDto[];
}

export class SaveMarketAnalysisDto {
  @IsIn(ANALYSIS_KINDS as unknown as string[])
  kind!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsOptional()
  @IsObject()
  resultJson?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  transcript?: ChatTurnDto[];
}
