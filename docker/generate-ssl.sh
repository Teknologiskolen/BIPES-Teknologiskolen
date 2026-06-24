#!/bin/bash

# Generate self-signed SSL certificates for development/testing
# For production, replace with Let's Encrypt certificates

set -e

SSL_DIR="$(dirname "$0")/ssl"
mkdir -p "$SSL_DIR"

echo "Generating self-signed SSL certificate..."
echo "⚠️  This is for DEVELOPMENT/TESTING only!"
echo "⚠️  For production, use Let's Encrypt or proper CA certificates"
echo ""

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$SSL_DIR/key.pem" \
    -out "$SSL_DIR/cert.pem" \
    -subj "/C=DK/ST=Denmark/L=Copenhagen/O=BIPES/OU=Development/CN=localhost"

chmod 600 "$SSL_DIR/key.pem"
chmod 644 "$SSL_DIR/cert.pem"

# These certs are bind-mounted into the mosquitto container, which reads them as
# the unprivileged "mosquitto" user (UID/GID 1883). The directory must be
# traversable by it and the key owned by it, or the broker crash-loops on
# "Unable to load server certificate". nginx reads the same files as root.
chmod 755 "$SSL_DIR"
if ! chown 1883:1883 "$SSL_DIR/cert.pem" "$SSL_DIR/key.pem" 2>/dev/null; then
    echo "⚠️  Could not chown certs to UID 1883 (need root). Until you run"
    echo "    'sudo chown 1883:1883 $SSL_DIR/*.pem' the mosquitto broker"
    echo "    will fail to read the key over TLS (port 8883)."
fi

echo "✅ SSL certificates generated in $SSL_DIR/"
echo "   - key.pem (private key)"
echo "   - cert.pem (certificate)"
echo ""
echo "For production, replace these with:"
echo "   docker/ssl/cert.pem - your domain certificate"
echo "   docker/ssl/key.pem - your private key"
