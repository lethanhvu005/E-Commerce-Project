import json
import os
import random
import uuid
from pathlib import Path

from locust import HttpUser, between, task


def load_accounts():
    path = os.getenv("LOAD_TEST_ACCOUNTS_FILE")
    if not path:
        return []
    return json.loads(Path(path).read_text(encoding="utf-8"))


ACCOUNTS = load_accounts()


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
        if ACCOUNTS:
            self.login(random.choice(ACCOUNTS))

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
            addresses = self.client.get(
                "/api/accounts/me/addresses/", headers=self.auth_headers(), name="GET /api/accounts/me/addresses/"
            )
            if addresses.ok and addresses.json().get("results"):
                self.address_id = addresses.json()["results"][0]["id"]

    def auth_headers(self):
        return {"Authorization": f"Bearer {self.access}"} if self.access else {}

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
        self.client.get("/api/cart/", headers=self.auth_headers(), name="GET /api/cart/")
        if self.variant_ids:
            self.client.post(
                "/api/cart/items/",
                json={"variant_id": random.choice(self.variant_ids), "quantity": 1},
                headers=self.auth_headers(),
                name="POST /api/cart/items/",
            )

    @task(10)
    def account(self):
        if self.access:
            self.client.get("/api/accounts/me/", headers=self.auth_headers(), name="GET /api/accounts/me/")

    @task(5)
    def wishlist_and_reviews(self):
        if self.access:
            self.client.get("/api/wishlist/", headers=self.auth_headers(), name="GET /api/wishlist/")
        if self.product_slugs:
            slug = random.choice(self.product_slugs)
            self.client.get(f"/api/products/{slug}/reviews/", name="GET /api/products/:slug/reviews/")

    @task(5)
    def checkout_cod(self):
        if not all([self.access, self.address_id, self.shipping_method_id]):
            return
        payload = {
            "address_id": self.address_id,
            "shipping_method_id": self.shipping_method_id,
            "checkout_key": str(uuid.uuid4()),
            "note": "Locust test database only",
        }
        self.client.post(
            "/api/orders/", json=payload, headers=self.auth_headers(), name="POST /api/orders/"
        )
