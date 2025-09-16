#!/bin/bash

# Test SSH connection script
# Replace YOUR_SERVER_IP with your actual server IP

SERVER_IP="51.112.237.66"
USERNAME="ubuntu"

echo "Testing SSH connection..."
echo "Server: $USERNAME@$SERVER_IP"
echo "Key: ~/.ssh/github_actions_key"

# Test connection
ssh -i ~/.ssh/github_actions_key -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $USERNAME@$SERVER_IP "echo 'SSH connection successful!'"

if [ $? -eq 0 ]; then
    echo "✅ SSH connection test passed!"
else
    echo "❌ SSH connection test failed!"
    echo "Make sure to:"
    echo "1. Replace YOUR_SERVER_IP with your actual server IP"
    echo "2. Add the public key to your server's ~/.ssh/authorized_keys"
    echo "3. Check that the server allows SSH key authentication"
fi
