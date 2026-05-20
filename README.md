# tavern

## Private game files

Private game downloads use Backblaze B2 through the S3-compatible API. Configure the required `BACKBLAZE_B2_*` environment variables and `ADMIN_API_TOKEN_HASHES`, then apply the Drizzle migrations.

See [docs/backblaze-private-files.md](docs/backblaze-private-files.md) for bucket setup, CORS, token generation, and Python upload automation.
