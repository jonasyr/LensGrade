import { z } from "zod";
export const score = z.number().min(0).max(10);
export const photoAnalysis = z.object({
  id:z.string(),
  subject:z.string(),
  summary:z.string(),
  aesthetic:score,
  technical:score,
  stockSuitability:score,
  strengths:z.array(z.string()).max(5),
  improvements:z.array(z.object({title:z.string(),why:z.string(),how:z.string()})).max(5),
  stockKeywords:z.array(z.string()).max(8),
  stockUseCases:z.array(z.string()).max(4)
});
export const reportSchema=z.object({
  photos:z.array(photoAnalysis),
  comparison:z.object({bestOverallId:z.string(),bestStockId:z.string(),reason:z.string()}).nullable()
});
export type Report=z.infer<typeof reportSchema>;
