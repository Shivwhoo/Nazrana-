# 🎁 Corporate Gifting Platform

An enterprise-grade B2B platform designed to streamline corporate gifting. Empower organizations to easily launch gifting campaigns, upload recipients via CSV, allow recipients to seamlessly claim gifts, and track full analytics—all seamlessly managed from a centralized dashboard.

---

## 🚀 Features

- **Multi-Tenant Organizations**: Complete RBAC (Role-Based Access Control) isolating organizations, workspaces, and teams.
- **Campaign Management**: Setup budgets, select catalog items, and orchestrate large-scale automated gift dispatches.
- **Recipient Claim Flow**: Delightful and secure recipient redemption portal with unique, unguessable magic links.
- **Scalable Worker Queue**: Background processing powered by BullMQ and Redis for heavy tasks (e.g., CSV imports, email fanouts).
- **Admin & Ops Console**: Granular platform-level control, wallet top-ups, and catalog management for super admins.
- **Virtual Wallets & Ledgers**: Built-in double-entry ledger system to hold and track campaign funds.
- **High-Performance Architecture**: Turborepo monorepo with Next.js (App Router), Express API, and isolated Background Workers.

---

## 🏗️ Architecture & Tech Stack

This project is built as a **Monorepo** using [Turborepo](https://turbo.build/).

### 💻 Frontend (`/frontend`)
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **State & Data**: React Hooks, `fetch`, NextAuth.js
- **Icons**: Lucide React

### ⚙️ Backend API (`/backend/api`)
- **Server**: [Express.js](https://expressjs.com/) with TypeScript
- **Database**: [PostgreSQL](https://www.postgresql.org/) managed by [Prisma ORM](https://www.prisma.io/)
- **Authentication**: JWT & NextAuth Integration
- **Payments**: Razorpay Integration

### 🔄 Background Worker (`/backend/worker`)
- **Queue System**: [BullMQ](https://docs.bullmq.io/) backed by [Redis](https://redis.io/)
- **Responsibilities**: 
  - Processing large CSV recipient imports
  - Email Fanouts (Dispatching gift invites)
  - Campaign lifecycle management (Stale exception monitoring)

### 📦 Shared Packages
- **`@gifting/prisma`**: Centralized database schema and client generation.
- **`@gifting/shared`**: Shared constants, types, and Redis queue configurations.

---

## 🛠️ Getting Started

### Prerequisites
Make sure you have the following installed on your system:
- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher)
- **PostgreSQL** (Running locally or via Docker)
- **Redis** (Running locally or via Docker)

### 1. Installation

Clone the repository and install all dependencies from the root:
```bash
git clone https://github.com/yourusername/corporate-gifting.git
cd corporate-gifting
pnpm install
```

### 2. Environment Variables

Create a `.env` file in the `backend/` directory based on the following template:

```env
DATABASE_URL="postgresql://postgres:123456@localhost:5432/gifting?schema=public"
REDIS_URL="redis://localhost:6379"
AUTH_SECRET="your-super-secret-key-change-in-production"
FRONTEND_URL="http://localhost:3000"

# Payment Gateway
RAZORPAY_KEY_ID="rzp_test_xxxx"
RAZORPAY_KEY_SECRET="xxxx"

# SMTP Settings
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT=465
EMAIL_USER="noreply@yourdomain.com"
EMAIL_PASS="your-password"
```

### 3. Database Setup

Run the Prisma migrations to set up your PostgreSQL schema, and seed the database with the initial platform admin and catalog products.

```bash
pnpm db:migrate
pnpm --filter "@gifting/prisma" run seed
```

### 4. Running the Development Server

Start the entire monorepo stack (Frontend, Backend API, and Worker) with a single command:

```bash
pnpm dev
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API Server**: [http://localhost:3001](http://localhost:3001)

*(Both services, including the background worker, will automatically reload upon file changes).*

---

## 🔑 Default Credentials

After running the seed script, you can log into the Ops/Admin Console using:

- **Email:** `admin@gifting.internal`
- **Password:** `Admin@1234`

---

## 📂 Project Structure

```
corporate-gifting/
├── frontend/               # Next.js web application
├── backend/
│   ├── api/                # Express.js REST API
│   ├── worker/             # BullMQ Redis workers
│   └── prisma/             # Schema, migrations, and seed scripts
├── packages/
│   └── shared/             # Shared TypeScript types and utilities
├── package.json            # Root workspace definitions
└── turbo.json              # Turborepo pipeline configuration
```

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
