# Online Shopping System

A responsive full-stack e-commerce starter built with React, Node.js, Express, and MySQL.

## Features
- Customer registration, login, and profile
- Product catalogue with search, category filtering, and sorting
- Persistent database-backed shopping cart
- Checkout and order placement (cash on delivery demo)
- Customer order history
- Admin dashboard for product CRUD and order status management
- JWT authentication, bcrypt password hashing, parameterized SQL queries

## Requirements
- Node.js 18+
- MySQL 8+

## 1. Database setup
Create the database and tables:

```bash
mysql -u root -p < backend/database/schema.sql
```

Optional sample data:

```bash
mysql -u root -p online_shopping < backend/database/seed.sql
```

Create a demo admin account after configuring the backend `.env` and installing backend packages:

```bash
cd backend
npm run create-admin
```

Demo admin credentials:
- Email: `admin@example.com`
- Password: `Admin@123`

Change this password before using the app beyond local testing.

## 2. Backend setup
```bash
cd backend
copy .env.example .env
```
On macOS/Linux use `cp .env.example .env`.

Edit `.env` with your MySQL credentials and a long random JWT secret.

```bash
npm install
npm run dev
```
API runs at `http://localhost:5000`.

## 3. Frontend setup
Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

## Notes
- The checkout is a demonstration using Cash on Delivery. No real payment gateway is connected.
- Product images use image URLs. You can replace them with your own hosted image URLs.
- The backend validates ownership for cart and order operations and checks stock inside a database transaction.
- This is an educational project starter. Add HTTPS, rate limiting, email verification, stronger admin provisioning, and production secrets management before deployment.
