import { UserInfo } from "df-downloader-common";
import { DfUiError } from "../../utils/error";
import { QueryableState } from "../utils";

export interface UserState extends QueryableState {
  loading: boolean;
  error: DfUiError | null;
  userInfo?: UserInfo;
}
