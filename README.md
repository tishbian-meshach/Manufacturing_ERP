# Manufacturing ERP System

[![Live Demo](https://img.shields.io/badge/Live%20Demo-View%20Application-blue?style=for-the-badge)](https://manufacturing-erp-five.vercel.app/)
[![Demo Video](https://img.shields.io/badge/Demo%20Video-Watch%20Now-red?style=for-the-badge)](https://drive.google.com/file/d/1K1gudIIEu5QQdhutNRr_igRoMa1umBff/view?usp=sharing)

A comprehensive Manufacturing Enterprise Resource Planning (ERP) system built with Next.js, designed to streamline manufacturing operations, inventory management, and production tracking.

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Database Schema](#-database-schema)
- [Installation](#-installation)
- [Environment Setup](#-environment-setup)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Features

### Core Manufacturing Management
- **Manufacturing Orders (MO)**: Create and track production orders with full lifecycle management
- **Work Orders (WO)**: Automated generation of work orders from BOM operations
- **Bill of Materials (BOM)**: Define product structures and component requirements
- **Work Centers**: Manage production resources and capacity planning

### Inventory & Stock Management
- **Real-time Inventory Tracking**: Monitor stock levels across all item types
- **Stock Ledger**: Complete audit trail of all inventory movements
- **Low Stock Alerts**: Automated notifications for inventory replenishment
- **Multi-category Support**: Raw materials, semi-finished goods, and finished products

### Production Planning & Control
- **Capacity Planning**: Work center utilization and efficiency tracking
- **Production Scheduling**: Planned vs actual production monitoring
- **Quality Control**: Production quality metrics and reporting
- **Progress Tracking**: Real-time production progress with visual indicators

### Analytics & Reporting
- **Interactive Dashboard**: Real-time KPIs and production metrics
- **Production Analytics**: Efficiency trends and performance analysis
- **Inventory Reports**: Stock movement and valuation reports
- **Custom Reporting**: Flexible reporting system for business intelligence

### User Management & Security
- **Role-based Access Control**: Admin, Manager, and Operator roles
- **Authentication**: Secure JWT-based authentication system
- **Multi-tenant Architecture**: Company-level data isolation
- **Audit Logging**: Complete user activity tracking

## 🛠 Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Recharts**: Data visualization library
- **Lucide React**: Modern icon library

### Backend
- **Next.js API Routes**: Server-side API endpoints
- **Neon Database**: Serverless PostgreSQL database
- **JWT Authentication**: Secure token-based auth
- **bcryptjs**: Password hashing

### Database
- **PostgreSQL**: Robust relational database
- **Prisma ORM**: Type-safe database access (planned)
- **Database Migrations**: Version-controlled schema updates

### DevOps & Deployment
- **Vercel**: Cloud platform for deployment
- **Environment Variables**: Secure configuration management
- **CI/CD**: Automated deployment pipelines

## 🏗 System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   API Routes    │    │   Database      │
│   (Next.js)     │◄──►│   (Next.js)     │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ - Dashboard     │    │ - RESTful APIs  │    │ - Users         │
│ - Forms         │    │ - Auth          │    │ - Items         │
│ - Tables        │    │ - CRUD Ops      │    │ - MOs/WOs       │
│ - Charts        │    │ - Real-time     │    │ - Stock Ledger  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

#### Frontend Architecture
- **Pages**: Route-based page components
- **Components**: Reusable UI components with shadcn/ui
- **Hooks**: Custom React hooks for data fetching
- **Utils**: Helper functions and constants
- **Types**: TypeScript interfaces and types

#### API Architecture
- **RESTful Endpoints**: Standard HTTP methods
- **Middleware**: Authentication and authorization
- **Error Handling**: Consistent error responses
- **Validation**: Input validation with Zod

## 📊 Database Schema

### Core Tables

#### Users
```sql
- id (TEXT, PK)
- email (TEXT, UNIQUE)
- name (TEXT)
- role (TEXT: admin/manager/operator)
- created_at, updated_at (TIMESTAMP)
```

#### Items
```sql
- id (SERIAL, PK)
- item_code (TEXT, UNIQUE)
- item_name (TEXT)
- item_type (raw_material/semi_finished/finished_good)
- unit_of_measure (TEXT)
- standard_rate (DECIMAL)
- current_stock (DECIMAL)
- is_active (BOOLEAN)
```

#### Manufacturing Orders
```sql
- id (SERIAL, PK)
- mo_number (TEXT, UNIQUE)
- item_id (FK → items)
- planned_qty, produced_qty (DECIMAL)
- status (draft/in_progress/completed/cancelled)
- priority (low/medium/high/urgent)
- planned_start_date, planned_end_date (DATE)
```

#### Work Orders
```sql
- id (SERIAL, PK)
- wo_number (TEXT, UNIQUE)
- manufacturing_order_id (FK → manufacturing_orders)
- work_center_id (FK → work_centers)
- operation_name (TEXT)
- planned_qty, completed_qty (DECIMAL)
- status (pending/in_progress/completed/on_hold)
- assigned_to (FK → users)
```

#### Stock Ledger
```sql
- id (SERIAL, PK)
- item_id (FK → items)
- voucher_type (TEXT)
- voucher_no (TEXT)
- actual_qty (DECIMAL)
- qty_after_transaction (DECIMAL)
- posting_date, posting_time (DATE/TIME)
```

## 🚀 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)
- npm or yarn package manager

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd manufacturing-erp
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```

   Configure the following environment variables:
   ```env
   DATABASE_URL=postgresql://username:password@host:port/database
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Database Setup**
   ```bash
   # Run database migrations
   npm run db:migrate

   # Seed initial data (optional)
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Access the Application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## ⚙️ Environment Setup

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | JWT signing secret | `your-secret-key-here` |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |

### Database Configuration

The system uses Neon PostgreSQL with connection pooling for optimal performance. The database schema includes:

- Automatic indexing for performance
- Foreign key constraints for data integrity
- Trigger-based updated_at timestamps
- Row-level security policies

## 📖 Usage

### Getting Started

1. **User Registration**: Create an admin account
2. **Setup Work Centers**: Define production resources
3. **Create Items**: Add raw materials and finished goods
4. **Define BOMs**: Create bill of materials for products
5. **Create Manufacturing Orders**: Start production planning

### Key Workflows

#### Manufacturing Order Creation
1. Select finished product from inventory
2. Choose BOM (automatically suggests based on item)
3. Set production quantity and dates
4. System auto-generates work orders
5. Assign work centers and operators

#### Production Tracking
1. Monitor work order progress in real-time
2. Track material consumption
3. Update production status
4. Auto-complete orders when targets met

#### Inventory Management
1. Monitor stock levels across all categories
2. Receive low-stock alerts
3. Track material movements
4. Generate inventory reports

## 🔌 API Documentation

### Authentication Endpoints

#### POST `/api/auth/login`
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

#### POST `/api/auth/register`
Register new user account.

### Manufacturing Endpoints

#### GET `/api/manufacturing-orders`
Retrieve all manufacturing orders with filtering.

**Query Parameters:**
- `status`: Filter by order status
- `assignee`: Filter by assigned user
- `page`: Pagination page number
- `limit`: Items per page

#### POST `/api/manufacturing-orders`
Create new manufacturing order.

**Request Body:**
```json
{
  "itemId": 1,
  "quantity": 100,
  "deadline": "2024-12-31",
  "priority": "high"
}
```

### Inventory Endpoints

#### GET `/api/items`
Retrieve inventory items with stock levels.

#### POST `/api/stock-ledger`
Record stock movement transaction.

**Request Body:**
```json
{
  "item_id": 1,
  "actual_qty": 50,
  "rate": 10.50,
  "posting_date": "2024-01-15"
}
```

## 🤝 Contributing

We welcome contributions to improve the Manufacturing ERP system!

### Development Guidelines

1. **Code Style**: Follow TypeScript and ESLint configurations
2. **Testing**: Write unit tests for new features
3. **Documentation**: Update README for API changes
4. **Commits**: Use conventional commit messages

### Branch Strategy
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches

### Pull Request Process
1. Create feature branch from `develop`
2. Implement changes with tests
3. Ensure all tests pass
4. Update documentation
5. Create pull request to `develop`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** for the amazing React framework
- **Vercel** for hosting and deployment platform
- **Neon** for serverless PostgreSQL
- **shadcn/ui** for beautiful UI components
- **Radix UI** for accessible primitives

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

**Built with ❤️ for manufacturing excellence**