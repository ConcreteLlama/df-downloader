import { DfContent } from "./df-types.js";

import { exec, spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { utimes } from "utimes";
import { Config } from "./config/config.js";
import { moveFile } from "./utils/file-utils.js";
import { Logger, LogLevel } from "./logger.js";
import { SubtitleInfo } from "./media-utils/subtitles.js";
import { parseArgsStringToArgv } from "string-argv";

let filenameIter = 0;

export class DfMetaInjector {
  readonly logger: Logger;
  constructor(private config: Config) {
    this.logger = config.logger;
  }

  setMeta(mpegFilePath: string, contentInfo: DfContent, subtitles?: SubtitleInfo[]) {
    this.logger.log(LogLevel.INFO, `Setting metadata for ${mpegFilePath}`);
    const workingFilename = `${this.config.workDir}/ffmpeg_${filenameIter++}.mp4`;
    let ffmpegCommand = `${ffmpegPath} -i "${mpegFilePath}" -codec copy`;
    if (subtitles && subtitles.length > 0) {
      subtitles.forEach((subtitleInfo) => {});
    }
    ffmpegCommand = `${ffmpegCommand} -metadata title="${this.sanitise(contentInfo.title)}"`;
    if (contentInfo.publishedDate) {
      ffmpegCommand += ` -metadata year=${contentInfo.publishedDate.getFullYear()}`;
    }
    if (contentInfo.description) {
      ffmpegCommand += ` -metadata synopsis="${this.sanitise(contentInfo.description)}"`;
      ffmpegCommand += ` -metadata description="${this.sanitise(contentInfo.description)}"`;
    }
    if (contentInfo.tags && contentInfo.tags.length > 0) {
      const tagListStr = contentInfo.tags.map((tag) => tag.replace(/:/g, "")).join(",");
      ffmpegCommand += ` -metadata genre="${tagListStr}"`;
    }
    ffmpegCommand = `${ffmpegCommand} "${workingFilename}"`;
    this.logger.log(LogLevel.DEBUG, `Metadata command for ${mpegFilePath}: ${ffmpegCommand}`);

    let err: any;
    return new Promise((resolve, reject) => {
      exec(ffmpegCommand, async (error, stdout, stderr) => {
        try {
          this.logger.log(LogLevel.DEBUG, `Metadata set complete`);
          if (error) {
            err = error;
            return;
          }
          await moveFile(workingFilename, mpegFilePath, {
            clobber: true,
          });
          this.logger.log(LogLevel.DEBUG, `Moved ${workingFilename} back to ${mpegFilePath}`);
        } catch (e) {
          this.logger.log(LogLevel.ERROR, e);
          err = e;
        } finally {
          if (err) {
            reject(err);
          } else {
            resolve("Done");
          }
        }
      });
    });
  }

  async injectSubs(mpegFilePath: string, subtitleInfo: SubtitleInfo) {
    this.logger.log(LogLevel.INFO, `Injecting ${subtitleInfo.language} subs for ${mpegFilePath}`);
    const workingFilename = `${this.config.workDir}/ffmpeg_${filenameIter++}.mp4`;
    const ffmpegArgs = parseArgsStringToArgv(
      `-i ${mpegFilePath} -i pipe: -c copy -c:s mov_text -metadata:s:s:0 language=${subtitleInfo.language} ${workingFilename}`
    );
    const process = spawn(ffmpegPath, ffmpegArgs);
    process.stdin.write(subtitleInfo.srt);
    process.stdin.end();
    await new Promise<void>((res, rej) => {
      let lastErr: any;
      process.on("close", (rc) => {
        if (rc !== 0) {
          return rej(lastErr.toString());
        }
        res();
      });
      process.on("error", (err) => {
        rej(err);
      });
      process.stderr.on("data", (chunk) => (lastErr = chunk));
    });
    await moveFile(workingFilename, mpegFilePath, {
      clobber: true,
    });
  }

  async setDate(filename: string, creationDate: Date) {
    try {
      const timestamp = creationDate.getTime();
      await utimes(filename, {
        btime: timestamp,
        mtime: timestamp,
        atime: timestamp,
      });
    } catch (e) {
      this.logger.log(LogLevel.ERROR, e);
    }
  }

  sanitise(data: string) {
    return data.replace(/\n/gi, " ").replace(/[^a-z0-9  ,\\.!\\-\\[\\]\\?]/gi, "");
  }
}
