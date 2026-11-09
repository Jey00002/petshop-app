#!/bin/bash
# Script de Respaldo Diario de Base de Datos - PetShop Pro (RNF02)
# Ley 29733 - Seguridad y Respaldo de Datos

BACKUP_DIR="$(dirname "$0")/../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/petshop_backup_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-Admin_12345!}"
DB_NAME="${DB_NAME:-petshop}"
DB_HOST="${DB_HOST:-localhost}"

echo "[$(date)] Iniciando respaldo de la base de datos '$DB_NAME'..."

mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" --routines --triggers --single-transaction "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "[$(date)] Respaldo completado exitosamente: $BACKUP_FILE"
    # Mantener sólo los últimos 15 respaldos
    find "$BACKUP_DIR" -type f -name "petshop_backup_*.sql.gz" -mtime +15 -delete
    exit 0
else
    echo "[$(date)] ERROR al generar el respaldo de la base de datos."
    exit 1
fi
