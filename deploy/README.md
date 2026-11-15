# Deploying SystemWars on Vultr

One server runs everything: the game (Next.js + SQLite), HTTPS (Caddy) and the voice relay (coturn).

## 1. Create the server (Vultr dashboard)

1. **Deploy → Cloud Compute → Shared CPU → Regular Performance → 4 vCPU / 8 GB** (about $40/month, billed hourly).
2. **Location:** closest to your players (for example New Jersey or Atlanta for the US East Coast).
3. **Operating system:** Ubuntu 24.04 LTS x64.
4. **SSH key:** add your public key (on Windows: `type %USERPROFILE%\.ssh\systemwars_vultr.pub`). Skip password login.
5. Optional: **Automatic backups** (+20%).
6. Deploy, and copy the server's IP address.

## 2. Set it up (about 5 minutes)

From your computer:

```bash
ssh -i ~/.ssh/systemwars_vultr root@SERVER_IP
```

On the server:

```bash
git clone https://github.com/IsaganiI/SystemWars.git /tmp/sw && bash /tmp/sw/deploy/setup.sh
```

It prints the address, for example `https://45-77-12-34.sslip.io`. sslip.io is a free name that points at your IP, so no domain is needed. HTTPS is required: browsers only allow the microphone (voice chat) on HTTPS.

**Own domain:** create an A record (for example `play.example.com`) pointing at the server IP, then run `sudo DOMAIN=play.example.com bash /opt/systemwars/deploy/setup.sh`.

## 3. Ship updates

After merging to `main`:

```bash
ssh -i ~/.ssh/systemwars_vultr root@SERVER_IP "bash /opt/systemwars/deploy/update.sh"
```

It backs up the database, pulls `main`, rebuilds and restarts. `BRANCH=name` deploys another branch.

## What runs where

| Piece | Details |
|---|---|
| Game | `/opt/systemwars`, systemd service `systemwars`, port 3000 on localhost only |
| HTTPS | Caddy on ports 80/443, automatic Let's Encrypt certificate |
| Voice relay | coturn on 3478 (UDP/TCP), relay ports 49160–49200/UDP; never relays into private networks |
| Database | `/opt/systemwars/.data/systemwars.sqlite`; daily backups in `/var/backups/systemwars` (14 days) |
| Secrets | `/opt/systemwars/.env.local` (mode 600) and `/etc/systemwars-turn-password`; generated once, kept on re-runs |
| Firewall | ufw: SSH, 80, 443, 3478, 49160–49200/UDP |

## Useful commands

```bash
systemctl status systemwars          # is the game running?
journalctl -u systemwars -f          # game logs
journalctl -u caddy -f               # HTTPS / certificate logs
ls -lh /var/backups/systemwars       # database backups
```

## Notes

- SQLite means one server. Moving to several servers needs Postgres and Redis (see the backend notes).
- To stop paying, **destroy** the server in Vultr (a powered-off server is still billed). Take a snapshot first to keep it.
