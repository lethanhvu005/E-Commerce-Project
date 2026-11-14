from django.contrib.auth import authenticate
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Address, User
from .serializers import AddressSerializer, LoginSerializer, RefreshSerializer, RegisterSerializer, UserSerializer
from .throttles import LoginRateThrottle, RegisterRateThrottle


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        with transaction.atomic():
            user = serializer.save()
    except IntegrityError:
        return Response({"email": ["Email đã tồn tại."]}, status=status.HTTP_400_BAD_REQUEST)
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        request=request,
        email=serializer.validated_data["email"],
        password=serializer.validated_data["password"],
    )
    if user is None or not user.is_active:
        return Response({"detail": "Email hoặc mật khẩu không đúng."}, status=status.HTTP_401_UNAUTHORIZED)
    refresh = RefreshToken.for_user(user)
    return Response({"access": str(refresh.access_token), "refresh": str(refresh)})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def refresh_token(request):
    input_serializer = RefreshSerializer(data=request.data)
    input_serializer.is_valid(raise_exception=True)
    try:
        raw_token = RefreshToken(input_serializer.validated_data["refresh"])
        user_id = raw_token.get("user_id")
        if not User.objects.filter(pk=user_id, is_active=True).exists():
            return Response(
                {"refresh": ["Tài khoản đã bị vô hiệu hóa hoặc không còn hoạt động."]},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        serializer = TokenRefreshSerializer(data=input_serializer.validated_data)
        serializer.is_valid(raise_exception=True)
    except TokenError:
        return Response(
            {"refresh": ["Refresh token không hợp lệ, đã hết hạn hoặc đã bị thu hồi."]},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    return Response(serializer.validated_data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    serializer = RefreshSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        token = RefreshToken(serializer.validated_data["refresh"])
        if str(token.get("user_id")) != str(request.user.pk):
            return Response(
                {"refresh": ["Refresh token không thuộc tài khoản hiện tại."]},
                status=status.HTTP_403_FORBIDDEN,
            )
        token.blacklist()
    except TokenError:
        return Response(
            {"refresh": ["Refresh token không hợp lệ hoặc đã bị thu hồi."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    if request.method == "GET":
        return Response(UserSerializer(request.user).data)
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


def _save_address(serializer, user):
    with transaction.atomic():
        if serializer.validated_data.get("is_default"):
            Address.objects.filter(user=user, is_default=True).update(is_default=False)
        return serializer.save(user=user)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def address_list(request):
    if request.method == "GET":
        addresses = Address.objects.filter(user=request.user).order_by("-is_default", "id")
        return Response({"results": AddressSerializer(addresses, many=True).data})
    serializer = AddressSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    address = _save_address(serializer, request.user)
    return Response(AddressSerializer(address).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def address_detail(request, address_id):
    address = get_object_or_404(Address, id=address_id, user=request.user)
    if request.method == "GET":
        return Response(AddressSerializer(address).data)
    if request.method == "DELETE":
        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = AddressSerializer(address, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    address = _save_address(serializer, request.user)
    return Response(AddressSerializer(address).data)
