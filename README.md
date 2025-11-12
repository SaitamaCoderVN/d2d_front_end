# D2D Frontend

Next.js 14 frontend application for the D2D (Decentralize Deployment) Solana deployment service.

## Features

- Modern, responsive UI with TailwindCSS
- Solana wallet adapter integration
- Real-time deployment tracking
- Dark mode support
- TypeScript for type safety
- Toast notifications
- Auto-refresh for pending deployments

## Getting Started

### Installation

```bash
npm install
# or
yarn install
```

### Configuration

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
```

### Development

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── WalletProvider.tsx    # Solana wallet setup
│   ├── DeploymentForm.tsx    # Deployment submission
│   ├── DeploymentHistory.tsx # Deployment list
│   └── ThemeToggle.tsx       # Dark mode toggle
├── lib/                   # Utilities
│   └── api.ts            # API client
└── types/                # TypeScript definitions
    └── index.ts          # Type definitions
```

## Components

### WalletProvider

Wraps the app with Solana wallet adapter context. Supports:
- Phantom
- Solflare
- Torus
- Ledger

### DeploymentForm

Form for submitting new deployment requests:
- Input validation
- Loading states
- Error handling
- Success notifications

### DeploymentHistory

Displays user's deployment history:
- Real-time status updates
- Auto-refresh for pending deployments
- Transaction links
- Error messages

### ThemeToggle

Dark mode toggle with persistent state.

## Styling

Built with TailwindCSS and custom CSS:
- Responsive design (mobile-first)
- Dark mode support
- Custom animations
- Gradient backgrounds
- Glassmorphism effects

## Wallet Integration

Uses `@solana/wallet-adapter-react` for wallet connectivity:

```typescript
import { useWallet } from '@solana/wallet-adapter-react';

const { publicKey, connected } = useWallet();
```

## API Integration

API calls are centralized in `src/lib/api.ts`:

```typescript
import { deploymentApi } from '@/lib/api';

// Create deployment
const deployment = await deploymentApi.create({
  userWalletAddress: publicKey.toString(),
  devnetProgramId: programId,
});

// Get user deployments
const deployments = await deploymentApi.getByUser(publicKey.toString());
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |
| `NEXT_PUBLIC_SOLANA_NETWORK` | Solana network | `mainnet-beta` |

## Deployment Status

Deployments can have the following statuses:
- **pending**: Request created, waiting to start
- **dumping**: Downloading program from devnet
- **deploying**: Uploading program to mainnet
- **success**: Deployment completed successfully
- **failed**: Deployment encountered an error

## User Experience

### Connection Flow
1. User visits the site
2. Clicks "Connect Wallet"
3. Selects wallet provider
4. Approves connection

### Deployment Flow
1. User enters devnet program ID
2. Clicks "Deploy to Mainnet"
3. Request is submitted to backend
4. Status updates automatically
5. User receives success notification
6. Can view program on Solana Explorer

## Development Tips

### Adding New Components

```bash
# Create component file
touch src/components/MyComponent.tsx
```

### Styling Best Practices

- Use Tailwind utility classes
- Follow dark mode patterns: `dark:bg-gray-800`
- Maintain responsive design: `md:flex`, `lg:grid-cols-3`
- Use semantic color names: `primary-600`, `success-500`

### Type Safety

All API responses and component props are typed:

```typescript
interface DeploymentFormProps {
  onDeploymentCreated: () => void;
}
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Next.js 14 App Router for optimal performance
- Static generation where possible
- Image optimization with Next.js Image
- Code splitting and lazy loading
- Minimal JavaScript bundle size

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast mode compatible

## Troubleshooting

### Wallet Not Connecting

1. Check browser extensions are installed
2. Verify wallet is on correct network
3. Clear browser cache
4. Try different wallet provider

### API Connection Failed

1. Verify backend is running
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Check browser console for errors
4. Verify CORS settings on backend

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

## Contributing

1. Follow existing code style
2. Add TypeScript types for new features
3. Ensure responsive design
4. Test on multiple devices
5. Update documentation

## License

MIT

