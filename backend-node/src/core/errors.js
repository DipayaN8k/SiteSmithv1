/** Domain error raised by services; answered as {"detail": "..."} with this status. */
export class ServiceError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}
