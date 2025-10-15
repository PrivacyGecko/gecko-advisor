# Wallet UI Components

Comprehensive wallet integration components for Gecko Advisor frontend, built with React 18, TypeScript, Tailwind CSS, and Solana Wallet Adapter.

## Components Created

### 1. **WalletButton** (`src/components/WalletButton.tsx`)
Main wallet connection button with three states:
- **Not connected**: "Connect Wallet" button with wallet icon
- **Connecting**: Loading spinner with status message
- **Connected**: Truncated address with dropdown menu

**Features:**
- Auto-authentication after wallet connection
- Sign message for backend verification using bs58 encoding
- Error handling with toast notifications
- Responsive design (icon-only on mobile by default)
- Dropdown menu with copy and disconnect options
- WCAG AA accessible

**Props:**
- `className?: string` - Additional CSS classes
- `showFullButtonOnMobile?: boolean` - Show full button text on mobile (default: false)

**Usage:**
```tsx
import { WalletButton } from '@/components/WalletButton';

<WalletButton />
<WalletButton showFullButtonOnMobile className="ml-4" />
```

### 2. **WalletDropdownMenu** (`src/components/WalletDropdownMenu.tsx`)
Dropdown menu displayed when wallet is connected.

**Features:**
- Display wallet address (full and truncated)
- Copy address to clipboard with visual feedback
- Disconnect wallet option
- Accessible keyboard navigation
- Auto-close when clicking outside

**Props:**
- `address: string` - Full wallet address
- `onDisconnect: () => void` - Disconnect callback
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { WalletDropdownMenu } from '@/components/WalletDropdownMenu';

<WalletDropdownMenu
  address="7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh8wCxXc8y1Q4"
  onDisconnect={handleDisconnect}
/>
```

### 3. **Wallet Utilities** (`src/lib/wallet.ts`)
Helper functions for wallet operations.

**Functions:**
- `truncateAddress(address, startChars?, endChars?)` - Format address for display
- `copyToClipboard(text, successMessage?)` - Copy to clipboard with toast
- `formatWalletAddress(address)` - Get full, short, and medium formats
- `isValidSolanaAddress(address)` - Validate Solana address format

**Usage:**
```tsx
import { truncateAddress, copyToClipboard } from '@/lib/wallet';

const short = truncateAddress("7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh8wCxXc8y1Q4");
// Returns: "7v91...y1Q4"

await copyToClipboard(address, "Address copied!");
```

### 4. **Usage Examples** (`src/examples/WalletButtonExample.tsx`)
Comprehensive examples showing various integration patterns:
- Basic usage
- Full button on mobile
- Custom styling
- Complete app integration
- Header integration
- Accessing wallet state

## Integration Guide

### Prerequisites
Ensure your app is wrapped with required providers:

```tsx
import { AuthProvider } from '@/contexts/AuthContext';
import { WalletProvider } from '@/contexts/WalletProvider';

function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        {/* Your app */}
      </WalletProvider>
    </AuthProvider>
  );
}
```

### Adding to Header
```tsx
import { WalletButton } from '@/components/WalletButton';

function Header() {
  return (
    <header>
      <nav>
        <div className="flex items-center justify-between">
          <Logo />
          <WalletButton />
        </div>
      </nav>
    </header>
  );
}
```

### Accessing Wallet State
```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { wallet, user } = useAuth();

  if (wallet.connected && wallet.address) {
    return <div>Connected: {wallet.address}</div>;
  }

  return <div>Not connected</div>;
}
```

## Backend Integration

The WalletButton automatically communicates with these backend endpoints:

### GET `/api/wallet/challenge/:address`
Get challenge message for wallet signature.

**Response:**
```json
{
  "challenge": "Sign this message to authenticate: {timestamp}"
}
```

### POST `/api/wallet/verify`
Verify wallet signature and authenticate user.

**Request:**
```json
{
  "walletAddress": "7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh8wCxXc8y1Q4",
  "signature": "base58-encoded-signature",
  "message": "challenge-message"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "subscription": "FREE"
  }
}
```

### POST `/api/wallet/link`
Link wallet to existing authenticated account.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request:**
```json
{
  "walletAddress": "7v91N7iZ9mNicL8WfG6cgSCKyRXydQjLh8wCxXc8y1Q4",
  "signature": "base58-encoded-signature",
  "message": "challenge-message"
}
```

### POST `/api/wallet/disconnect`
Disconnect wallet from account.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

## Dependencies

All dependencies are already installed:
- `@solana/wallet-adapter-react` - Solana wallet adapter hooks
- `@solana/wallet-adapter-react-ui` - Wallet selection modal
- `@solana/web3.js` - Solana web3 utilities
- `bs58` - Base58 encoding for signatures (newly added)
- `react-hot-toast` - Toast notifications
- `clsx` - Conditional CSS classes

## Design System

Components follow the Gecko Advisor design system:
- **Primary color**: `gecko-600` (#15803d) for buttons
- **Hover state**: `gecko-700` for interactive elements
- **Typography**: Inter font family
- **Spacing**: Tailwind CSS spacing scale
- **Border radius**: Consistent `rounded-lg` (8px)
- **Shadows**: `shadow-sm` and `shadow-lg` for depth

## Accessibility

All components meet WCAG AA standards:
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management for dropdowns
- Screen reader compatible
- Color contrast ratios compliant
- Semantic HTML structure

## Responsive Design

Components are mobile-first and responsive:
- **Desktop**: Full button with address text
- **Mobile**: Icon-only by default (configurable)
- **Tablet**: Adaptive layout
- **Breakpoints**: sm (640px), md (768px), lg (1024px)

## Error Handling

Robust error handling with user feedback:
- Toast notifications for all operations
- Clear error messages for wallet connection failures
- Graceful handling of signature rejection
- Auto-disconnect on authentication failure
- Logging for debugging

## Security

Security best practices implemented:
- Challenge-response authentication flow
- Signature verification on backend
- JWT token storage in localStorage
- Automatic token refresh on page load
- No sensitive data in frontend state

## Testing

Components are designed for testability:
- Clear data-testid attributes (can be added)
- Mocked wallet adapter for tests
- Isolated utility functions
- Pure components with minimal side effects

## Performance

Optimized for performance:
- React.memo for expensive components (can be added)
- useCallback for event handlers
- Minimal re-renders
- Lazy loading for dropdown menu
- Efficient state management

## Future Enhancements

Potential improvements:
- Add WalletIcon component for different wallet types
- Multi-wallet support display
- Transaction history integration
- Wallet balance display
- ENS/SNS domain name resolution
- QR code for mobile wallet connection

## Support

For issues or questions:
- Check `/src/examples/WalletButtonExample.tsx` for usage patterns
- Review AuthContext integration in `/src/contexts/AuthContext.tsx`
- Verify WalletProvider setup in `/src/contexts/WalletProvider.tsx`

## License

SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2025 Privacy Advisor contributors
