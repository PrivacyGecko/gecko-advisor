# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions of Gecko Advisor:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

We recommend always running the latest stable release to ensure you have the most recent security patches and improvements.

---

## Reporting a Vulnerability

We take the security of Gecko Advisor seriously. If you discover a security vulnerability, we appreciate your help in disclosing it to us responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, email us at: **security@geckoadvisor.com**

### What to Include in Your Report

To help us understand and address the issue quickly, please include:

1. **Description**: Clear description of the vulnerability and its potential impact
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Affected Versions**: Which version(s) of Gecko Advisor are affected
4. **Environment Details**: OS, Node.js version, deployment method (Docker, manual, etc.)
5. **Proof of Concept**: Code snippets, screenshots, or logs demonstrating the issue
6. **Suggested Fix** (optional): If you have ideas on how to fix it, we'd love to hear them
7. **Your Contact Information**: So we can follow up with questions or updates

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt of your report within **48 hours**
2. **Initial Assessment**: We will provide an initial assessment within **5 business days**
3. **Regular Updates**: We will keep you informed of our progress as we investigate and develop a fix
4. **Resolution Timeline**: We aim to resolve critical vulnerabilities within **30 days** of disclosure
5. **Credit**: With your permission, we will acknowledge your responsible disclosure in release notes

### Public Disclosure Policy

- **Coordinated Disclosure**: We follow coordinated disclosure practices
- **Embargo Period**: We request a reasonable embargo period (typically 90 days) to develop and deploy fixes
- **Public Advisory**: After a fix is released, we will publish a security advisory on GitHub
- **CVE Assignment**: For significant vulnerabilities, we will request CVE assignment

---

## Security Best Practices for Self-Hosting

If you're self-hosting Gecko Advisor, follow these best practices to maintain a secure deployment:

### Environment & Configuration

- **Keep Dependencies Updated**: Regularly run `pnpm update` to get security patches
- **Secure Environment Variables**: Never commit `.env` files or expose secrets in logs
- **Use Strong Secrets**: Generate strong, random values for `ADMIN_API_KEY` and database passwords
- **Enable HTTPS**: Always use TLS/SSL in production (configure via reverse proxy like Nginx)
- **Configure CORS**: Set `ALLOWED_ORIGINS` to specific domains, never use `*` in production

### Database Security

- **Strong Passwords**: Use complex passwords for PostgreSQL and Redis
- **Network Isolation**: Run databases in private networks, not exposed to the internet
- **Regular Backups**: Implement automated backup strategy with encryption
- **Access Control**: Use separate database users with minimal required permissions
- **Connection Security**: Enable SSL/TLS for database connections in production

### Application Security

- **Bot Protection**: Enable Cloudflare Turnstile (`TURNSTILE_SECRET_KEY`) to prevent abuse
- **Rate Limiting**: The built-in intelligent rate limiter is enabled by default—don't disable it
- **Admin Endpoints**: Protect `/api/admin/*` endpoints with strong `ADMIN_API_KEY`
- **Security Headers**: Use the provided Helmet middleware configuration (enabled by default)
- **Input Validation**: All API inputs are validated with Zod—don't bypass this
- **Object Storage**: If using S3-compatible storage, use IAM roles or scoped access keys

### Infrastructure Security

- **Docker Security**:
  - Run containers as non-root users (already configured)
  - Keep base images updated
  - Scan images for vulnerabilities with `docker scan`
- **Firewall Rules**: Only expose necessary ports (80, 443)
- **Monitoring**: Enable logging and monitoring to detect suspicious activity
- **Updates**: Subscribe to GitHub releases to stay informed of security updates

### Network & Deployment

- **Reverse Proxy**: Use Nginx or similar with security headers (CSP, HSTS, X-Frame-Options)
- **DDoS Protection**: Consider using Cloudflare or similar service for DDoS mitigation
- **Network Segmentation**: Isolate frontend, backend, worker, and databases in separate networks
- **Regular Audits**: Periodically review logs, access patterns, and security configurations

---

## Known Security Considerations

### By Design

- **Public Scan Results**: Scan reports are public by default for transparency. Don't scan sensitive/internal sites.
- **No Authentication**: The public API doesn't require authentication. Use rate limiting and bot protection.
- **Shallow Crawling**: Scans are limited to 10 pages and same-origin only to prevent abuse.

### Current Limitations

- **Admin API**: Admin endpoints rely on `X-Admin-Key` header. Rotate this key regularly.
- **Redis Queue**: Redis connections should be on a private network. BullMQ jobs contain scan URLs.
- **Object Storage**: Archived reports in object storage should use appropriate bucket policies.

---

## Security Disclosure Hall of Fame

We recognize and thank security researchers who responsibly disclose vulnerabilities:

*No disclosures yet. Be the first!*

---

## Contact

- **Security Issues**: security@geckoadvisor.com
- **General Inquiries**: hello@geckoadvisor.com
- **GitHub Issues**: [github.com/yourusername/gecko-advisor/issues](https://github.com/yourusername/gecko-advisor/issues) (for non-security bugs only)

---

**Thank you for helping keep Gecko Advisor and the community safe!**
