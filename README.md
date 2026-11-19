# B&G Fast Food

B&G Fast Food is a restaurant ordering application for customers who want to browse a menu and place an order online. The application presents a selection of South African-inspired meals, including braaied meat, pap, chicken, pork, beef, salads, and combination plates.

The project includes a customer-facing ordering experience and an administration page for managing submitted orders.

## Highlights

- Responsive customer menu
- Menu items with images, descriptions, and prices
- Shopping cart with quantity controls
- Customer details and order submission
- Order persistence through the application server
- Administration page for reviewing orders
- JSON files for simple menu and order storage
- Express-based backend API
- Black, red, and white restaurant-themed interface

## Application structure

| File or directory | Purpose |
| --- | --- |
| `index.html` | Customer ordering page |
| `styles.css` | Shared application styling |
| `app.js` | Menu, cart, and customer ordering logic |
| `admin.html` | Administration page |
| `admin.js` | Administration and order-management logic |
| `server.js` | Express server and API routes |
| `menu.json` | Available menu items |
| `orders.json` | Submitted orders |
| `test-order.js` | Order workflow test |
| `assets/images/` | Menu and restaurant artwork |

## Technology

- HTML5
- CSS3
- JavaScript
- Node.js
- Express
- Nodemailer
- UUID

## Requirements

- Node.js 18 or newer
- npm

## Installation

Clone or download the project, then install its dependencies from the project directory:

```powershell
npm install
```

## Running the application

Start the application server with:

```powershell
npm start
```

The server port is configurable through the `PORT` environment variable. When deployed, use the public address assigned by your hosting provider to access the customer and administration pages.

## Testing

Run the automated order-flow test with:

```powershell
npm test
```

## Configuration

The application supports environment-based configuration for deployment. Administrator credentials and email settings should be supplied through environment variables rather than committed to the repository.

For production deployments, configure:

- A strong administrator password
- Email transport credentials
- A persistent database or managed storage solution
- HTTPS
- Authentication and authorization for administration features
- Secure environment-variable storage

## Data storage

The current version uses `menu.json` for menu data and `orders.json` for submitted orders. This approach is suitable for demonstrations and small-scale testing. A production deployment should replace file-based storage with a database that supports concurrent access, backups, and access controls.

## Security notice

The administration page and file-based data store are intended for demonstration purposes. Do not expose the application publicly without adding proper authentication, authorization, input validation, secure secrets management, and production-grade persistence.

## License

No license has been specified for this project.
