import re

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

_PERIOD_SECONDS = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}


class WindowedRateMixin:
    """Accept rates such as '5/10minute' in addition to DRF's '5/minute'.

    DRF only reads the first character of the period, so '10minute' would raise KeyError (HTTP 500).
    Rates are also resolved at request time so settings overrides take effect.
    """

    def get_rate(self):
        from rest_framework.settings import api_settings

        return api_settings.DEFAULT_THROTTLE_RATES[self.scope]

    def parse_rate(self, rate):
        if rate is None:
            return (None, None)
        match = re.fullmatch(r'\s*(\d+)\s*/\s*(\d*)\s*([smhd])[a-z]*\s*', str(rate))
        if not match:
            return super().parse_rate(rate)
        num, window, unit = match.groups()
        return int(num), _PERIOD_SECONDS[unit] * int(window or 1)


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'password_reset'


class RegisterRateThrottle(AnonRateThrottle):
    scope = 'register'


class OtpRateThrottle(WindowedRateMixin, UserRateThrottle):
    """Limit OTP email requests per authenticated account."""

    scope = 'otp'
