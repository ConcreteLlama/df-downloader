import { z } from "zod";
import { MediaType } from "./df-config.js";
import { ContentInfoFilter } from "../models/filter.js";

export const AutomaticDownloadsConfig = z.object({
  enabled: z.boolean().default(false),
  mediaTypes: z.array(MediaType).default(["HEVC", "h.264 (4K)", "h.264 (1080p)", "h.264", "MP3"]),
  downloadDelay: z.number().min(0).default(0),
  exclusionFilters: z.array(ContentInfoFilter).optional(),
});
export type AutomaticDownloadsConfig = z.infer<typeof AutomaticDownloadsConfig>;
export const AutomaticDownloadsConfigKey = "automaticDownloads";
