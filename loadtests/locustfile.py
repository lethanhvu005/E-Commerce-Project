import json
import os
import random
import uuid
from itertools import cycle
from pathlib import Path

from locust import HttpUser, between, task


def load_accounts():
    path = os.getenv("LOAD_TEST_ACCOUNTS_FILE")
    if not path:
        return []
    return json.loads(Path(path).read_text(encoding="utf-8"))


ACCOUNTS = load_accounts()
ACCOUNT_ITERATOR = cycle(ACCOUNTS) if ACCOUNTS else None


class CommerceUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        self.access = None
        self.refresh = None
        self.product_slugs = []
        self.variant_ids = []
        self.address_id = None
        self.shipping_method_id = None
        products = self.client.get("/api/products/?page_size=50", name="GET /api/products/")
        if products.ok:
            for product in products.json().get("results", []):
                self.product_slugs.append(product["slug"])
        methods = self.client.get("/api/shipping-methods/", name="GET /api/shipping-methods/")
        if methods.ok and methods.json().get("results"):
            self.shipping_method_id = methods.json()["results"][0]["id"]
        if ACCOUNT_ITERATOR is not None:
            self.login(next(ACCOUNT_ITERATOR))
        elif os.getenv("LOAD_TEST_AUTO_REGISTER", "1") == "1":
            self.register_unique_user()

    def register_unique_user(self):
        unique_id = uuid.uuid4().hex[:10]
        email = f"locust.{unique_id}@example.test"
        password = f"Locust!{unique_id}Aa"
        response = self.client.post(
            "/api/auth/register/",
            json={
                "email": email,
                "password": password,
                "first_name": "Locust",
                "last_name": unique_id[:6],
            },
            name="POST /api/auth/register/",
        )
        if response.ok:
            data = response.json()
            self.access = data.get("access")
            self.refresh = data.get("refresh")
            self.ensure_address()

    def login(self, account):
        response = self.client.post(
            "/api/auth/login/",
            json={"email": account["email"], "password": account["password"]},
            name="POST /api/auth/login/",
        )
        if response.ok:
            tokens = response.json()
            self.access = tokens["access"]
            self.refresh = tokens["refresh"]
            self.ensure_address()

    def ensure_address(self):
        addresses = self.request_with_auth(
            "GET", "/api/accounts/me/addresses/", name="GET /api/accounts/me/addresses/"
        )
        if addresses is not None and addresses.ok and addresses.json().get("results"):
            self.address_id = addresses.json()["results"][0]["id"]
            return
        created = self.request_with_auth(
            "POST",
            "/api/accounts/me/addresses/",
            name="POST /api/accounts/me/addresses/",
            json={
                "recipient_name": "Locust Customer",
                "phone": "0901234567",
                "address_line": "123 Đường Nguyễn Huệ",
                "ward": "Phường Bến Nghé",
                "province": "TP. Hồ Chí Minh",
                "is_default": True,
            },
        )
        if created is not None and created.ok:
            self.address_id = created.json().get("id")

    def auth_headers(self):
        return {"Authorization": f"Bearer {self.access}"} if self.access else {}

    def refresh_access_token(self):
        if not self.refresh:
            return False
        res = self.client.post(
            "/api/auth/refresh/",
            json={"refresh": self.refresh},
            name="POST /api/auth/refresh/",
        )
        if res.ok:
            data = res.json()
            self.access = data.get("access")
            if data.get("refresh"):
                self.refresh = data["refresh"]
            return True
        self.access = None
        self.refresh = None
        return False

    def request_with_auth(self, method, url, name=None, **kwargs):
        if not self.access:
            return None
        headers = kwargs.pop("headers", {})
        headers.update(self.auth_headers())
        response = self.client.request(method, url, name=name or url, headers=headers, **kwargs)
        if response.status_code == 401 and self.refresh_access_token():
            headers.update(self.auth_headers())
            response = self.client.request(method, url, name=name or url, headers=headers, **kwargs)
        return response

    @task(45)
    def browse_products(self):
        self.client.get("/api/products/?page_size=12", name="GET /api/products/")

    @task(20)
    def search_and_detail(self):
        self.client.get("/api/products/?search=gaming&page_size=12", name="GET /api/products/?search=")
        if self.product_slugs:
            slug = random.choice(self.product_slugs)
            response = self.client.get(f"/api/products/{slug}/", name="GET /api/products/:slug/")
            if response.ok:
                variants = response.json().get("variants", [])
                self.variant_ids = [item["id"] for item in variants if item.get("available", 0) > 0]

    @task(15)
    def cart_flow(self):
        if not self.access:
            return
        self.request_with_auth("GET", "/api/cart/", name="GET /api/cart/")
        if self.variant_ids:
            self.request_with_auth(
                "POST",
                "/api/cart/items/",
                name="POST /api/cart/items/",
                json={"variant_id": random.choice(self.variant_ids), "quantity": 1},
            )

    @task(10)
    def account(self):
        if self.access:
            self.request_with_auth("GET", "/api/accounts/me/", name="GET /api/accounts/me/")

    @task(5)
    def wishlist_and_reviews(self):
        if self.access:
            self.request_with_auth("GET", "/api/wishlist/", name="GET /api/wishlist/")
        if self.product_slugs:
            slug = random.choice(self.product_slugs)
            self.client.get(f"/api/products/{slug}/reviews/", name="GET /api/products/:slug/reviews/")

    @task(5)
    def checkout_cod(self):
        if not all([self.access, self.address_id, self.shipping_method_id]):
            return
        cart_res = self.request_with_auth("GET", "/api/cart/", name="GET /api/cart/")
        items = cart_res.json().get("items", []) if (cart_res and cart_res.ok) else []
        if not items and self.variant_ids:
            add_res = self.request_with_auth(
                "POST",
                "/api/cart/items/",
                name="POST /api/cart/items/",
                json={"variant_id": random.choice(self.variant_ids), "quantity": 1},
            )
            if not (add_res and add_res.ok):
                return
        elif not items:
            return

        payload = {
            "address_id": self.address_id,
            "shipping_method_id": self.shipping_method_id,
            "checkout_key": str(uuid.uuid4()),
            "note": "Locust test database only",
        }
        with self.client.post(
            "/api/orders/",
            json=payload,
            headers=self.auth_headers(),
            name="POST /api/orders/",
            catch_response=True,
        ) as response:
            if response.status_code in (200, 201):
                response.success()
            elif response.status_code == 401 and self.refresh_access_token():
                response.failure("JWT expired during checkout, refreshed for next iteration")
            else:
                response.failure(f"Order placement failed ({response.status_code})")
