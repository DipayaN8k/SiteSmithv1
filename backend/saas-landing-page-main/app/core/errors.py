class ServiceError(Exception):
    """Domain error raised by services; mapped to an HTTP response in app.main."""

    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
