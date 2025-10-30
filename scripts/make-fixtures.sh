#!/bin/bash
set -euo pipefail

# C2 Concierge Fixture Generation Script
# Phase 0: Generate test fixtures for acceptance testing

echo "🏗️  C2 Concierge - Creating Phase 0 Fixtures"

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FIXTURES_DIR="$PROJECT_ROOT/fixtures"
SOURCE_DIR="$FIXTURES_DIR/source"
SIGNED_DIR="$FIXTURES_DIR/signed"
MANIFESTS_DIR="$FIXTURES_DIR/manifests"

# Create directories
mkdir -p "$SOURCE_DIR" "$SIGNED_DIR" "$MANIFESTS_DIR"

# Function to generate a test image
generate_test_image() {
    local name=$1
    local width=$2
    local height=$3
    local color=$4
    local output="$SOURCE_DIR/$name.jpg"
    
    echo "📸 Generating $name ($width x $height)..."
    
    # Use ImageMagick if available, otherwise create a dummy file
    if command -v magick >/dev/null 2>&1; then
        magick -size "${width}x${height}" "xc:$color" \
            -pointsize 20 -fill white -gravity center \
            -annotate +0+0 "$name" \
            "$output"
    else
        # Create a simple placeholder file if ImageMagick not available
        echo "dummy-image-$name" > "$output"
    fi
}

# Generate diverse test images
echo "🎨 Creating source images..."
generate_test_image "portrait" "400" "600" "#FF6B6B"
generate_test_image "landscape" "800" "400" "#4ECDC4"
generate_test_image "square" "500" "500" "#45B7D1"
generate_test_image "wide" "1200" "600" "#96CEB4"
generate_test_image "tall" "300" "900" "#FFEAA7"
generate_test_image "text-overlay" "600" "400" "#DDA0DD"
generate_test_image "transparent" "400" "400" "#98D8C8"
generate_test_image "gradient" "800" "600" "#F7DC6F"
generate_test_image "pattern" "500" "500" "#85C1E2"
generate_test_image "minimal" "200" "200" "#F8B739"

# Function to create a dummy C2PA manifest
create_manifest() {
    local asset_name=$1
    local manifest_hash=$2
    local output="$MANIFESTS_DIR/${manifest_hash}.c2pa"
    
    cat > "$output" << EOF
{
  "@context": ["https://w3id.org/c2pa/1.0"],
  "claim": {
    "signature": "dummy-signature-${asset_name}",
    "assertion_data": {
      "c2pa.assertions": [
        {
          "label": "c2pa.actions",
          "data": {
            "actions": [
              {
                "action": "c2pa.created",
                "when": "2025-10-30T14:00:00Z",
                "softwareAgent": "C2-Concierge-Fixture-Generator"
              }
            ]
          }
        }
      ]
    }
  },
  "asset_info": {
    "asset_name": "$asset_name",
    "manifest_hash": "$manifest_hash"
  }
}
EOF
}

# Function to create signed variant (with simulated embedded claims)
create_signed_variant() {
    local source_file=$1
    local asset_name=$2
    local signed_file="$SIGNED_DIR/$asset_name.jpg"
    
    echo "✍️  Creating signed variant for $asset_name..."
    
    # Copy source to signed directory
    cp "$source_file" "$signed_file"
    
    # Simulate embedded C2PA by adding metadata (if ImageMagick available)
    if command -v magick >/dev/null 2>&1; then
        magick "$signed_file" \
            -set exif:Software "C2-Concierge-Signed" \
            -set exif:Copyright "Embedded C2PA claim for $asset_name" \
            "$signed_file"
    fi
}

# Generate signed variants and manifests
echo "🔐 Creating signed variants and manifests..."
MAPPING_CSV="$FIXTURES_DIR/mapping.csv"
echo "asset_path,manifest_sha256" > "$MAPPING_CSV"

for source_file in "$SOURCE_DIR"/*.jpg; do
    if [[ -f "$source_file" ]]; then
        asset_name=$(basename "$source_file" .jpg)
        
        # Generate deterministic manifest hash based on asset name
        manifest_hash=$(echo -n "$asset_name-manifest-2025-10-30" | sha256sum | cut -d' ' -f1)
        
        # Create signed variant
        create_signed_variant "$source_file" "$asset_name"
        
        # Create manifest
        create_manifest "$asset_name" "$manifest_hash"
        
        # Add to mapping
        echo "signed/$asset_name.jpg,$manifest_hash" >> "$MAPPING_CSV"
    fi
done

# Create additional test scenarios
echo "🧪 Creating additional test scenarios..."

# Create a corrupted manifest for testing hash alignment failures
cat > "$MANIFESTS_DIR/corrupted-manifest.c2pa" << EOF
{
  "corrupted": true,
  "claim": "This should fail hash alignment"
}
EOF

# Create an empty manifest
touch "$MANIFESTS_DIR/empty.c2pa"

echo ""
echo "✅ Fixtures created successfully!"
echo "📊 Summary:"
echo "   - Source images: $(ls -1 "$SOURCE_DIR"/*.jpg | wc -l)"
echo "   - Signed variants: $(ls -1 "$SIGNED_DIR"/*.jpg | wc -l)"
echo "   - Manifests: $(ls -1 "$MANIFESTS_DIR"/*.c2pa | wc -l)"
echo "   - Mapping file: $MAPPING_CSV"
echo ""
echo "🎯 Fixtures are ready for Phase 0 acceptance testing!"
