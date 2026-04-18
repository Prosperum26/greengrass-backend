import { Logger } from '@nestjs/common';
import {
  CheckInLogStatus,
  CheckInFailReason,
} from '../constants/checkin.constants';

export class CheckInLogger {
  private readonly logger = new Logger(CheckInLogger.name);

  logSuccess(userId: string, eventId: string): void {
    this.logger.log(
      `[CHECKIN] userId=${userId} eventId=${eventId} status=${CheckInLogStatus.SUCCESS} reason=CHECKIN_SUCCESS`,
    );
  }

  logFailure(
    userId: string,
    eventId: string,
    reason: CheckInFailReason,
    details?: string,
  ): void {
    const detailStr = details ? ` details=${details}` : '';
    this.logger.warn(
      `[CHECKIN] userId=${userId} eventId=${eventId} status=${CheckInLogStatus.FAIL} reason=${reason}${detailStr}`,
    );
  }

  logEventNotFound(eventId: string): void {
    this.logger.warn(
      `[CHECKIN] eventId=${eventId} status=${CheckInLogStatus.FAIL} reason=${CheckInFailReason.EVENT_NOT_FOUND}`,
    );
  }

  logDuplicateAttempt(userId: string, eventId: string): void {
    this.logger.warn(
      `[CHECKIN] userId=${userId} eventId=${eventId} status=${CheckInLogStatus.FAIL} reason=${CheckInFailReason.DUPLICATE_CHECKIN}`,
    );
  }

  logInvalidQr(userId: string, eventId: string): void {
    this.logger.warn(
      `[CHECKIN] userId=${userId} eventId=${eventId} status=${CheckInLogStatus.FAIL} reason=${CheckInFailReason.INVALID_QR}`,
    );
  }

  logNotRegistered(userId: string, eventId: string): void {
    this.logger.warn(
      `[CHECKIN] userId=${userId} eventId=${eventId} status=${CheckInLogStatus.FAIL} reason=${CheckInFailReason.NOT_REGISTERED}`,
    );
  }
}
