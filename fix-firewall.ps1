# Add firewall rule for Node.js to allow Expo connections
New-NetFirewallRule -DisplayName "Node.js for Expo" -Direction Inbound -Protocol TCP -LocalPort 3000,8081,19000,19001,19002 -Action Allow
New-NetFirewallRule -DisplayName "Node.js for Expo" -Direction Outbound -Protocol TCP -LocalPort 3000,8081,19000,19001,19002 -Action Allow
Write-Host "Firewall rules added for Expo development server"
