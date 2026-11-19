from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'password_reset'


class RegisterRateThrottle(AnonRateThrottle):
    scope = 'register'


class OtpRateThrottle(UserRateThrottle):
    """Limit OTP email requests per authenticated account."""

    scope = 'otp'
