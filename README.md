# TheBoost Backend

## Prerequisites
- Node.js (v16+ recommended)
- MongoDB
- npm or yarn

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/YourUsername/theboost-backend.git
cd theboost-backend
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Configuration
Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/theboost
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRATION=7d
NODE_ENV=development

# Blockchain Configuration
BLOCKCHAIN_NETWORK=mainnet

# Email Configuration (Optional)
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
```

### 4. Run the Application

#### Development Mode
```bash
npm run dev
# or
yarn dev
```

#### Production Mode
```bash
npm start
# or
yarn start
```

## API Endpoints

### Authentication
- `POST /api/auth/register`: User registration
- `POST /api/auth/login`: User login
- `POST /api/auth/refresh-token`: Get new access token
- `POST /api/auth/forgot-password`: Initiate password reset
- `PATCH /api/auth/reset-password/:token`: Reset password

### Properties
- `GET /api/properties`: List all properties
- `GET /api/properties/:id`: Get specific property details
- `POST /api/properties`: Create a new property (Admin)
- `PATCH /api/properties/:id`: Update property details (Admin)

### Investments
- `GET /api/investments`: List user's investments
- `POST /api/investments`: Create a new investment
- `GET /api/investments/:id`: Get specific investment details
- `PATCH /api/investments/:id/sell`: Sell investment tokens

### Transactions
- `GET /api/transactions`: List user's transactions
- `POST /api/transactions/deposit`: Deposit funds
- `POST /api/transactions/withdraw`: Withdraw funds

## Authentication Flow

1. Register a new user
2. Log in to receive access and refresh tokens
3. Use access token in `Authorization` header
4. Use refresh token to get new access token when expired

## Blockchain Integration

The backend supports blockchain token management through smart contract interactions.

## Security Features
- JWT Authentication
- Password hashing
- Role-based access control
- KYC verification workflow

## Development

### Running Tests
```bash
npm test
# or
yarn test
```

### Code Linting
```bash
npm run lint
# or
yarn lint
```

## Deployment

### Environment Specific Configurations
- Adjust `.env` for different environments
- Use environment-specific MongoDB connections
- Configure blockchain network settings

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT License

## Contact
Support: support@theboost.com