PUBLIC_IP=$(ip -4 route get 1.0.0.0 | awk '{print $7; exit}')

# Get server info from tivet
echo 'Fetching tivet server info'
response=$(
	curl -f \
		-H "Authorization: Bearer __SERVER_TOKEN__" \
		"__TUNNEL_API_EDGE_API__/provision/servers/$PUBLIC_IP/info"
)

# Fetch data
name=$(echo $response | jq -r '.name')
server_id=$(echo $response | jq -r '.server_id')
datacenter_id=$(echo $response | jq -r '.datacenter_id')
cluster_id=$(echo $response | jq -r '.cluster_id')
vlan_ip=$(echo $response | jq -r '.vlan_ip')
public_ip=$(echo $response | jq -r '.public_ip')

# Template initialize script
initialize_script="/usr/bin/tivet_initialize.sh"
sed -i "s/___NODE_NAME___/$name/g" $initialize_script
sed -i "s/___SERVER_ID___/$server_id/g" $initialize_script
sed -i "s/___DATACENTER_ID___/$datacenter_id/g" $initialize_script
sed -i "s/___CLUSTER_ID___/$cluster_id/g" $initialize_script
sed -i "s/___VLAN_IP___/$vlan_ip/g" $initialize_script
sed -i "s/___PUBLIC_IP___/$public_ip/g" $initialize_script

# Run initialize script
"$initialize_script"
