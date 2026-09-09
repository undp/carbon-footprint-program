// database.tf — managed PostgreSQL.
//
// Mirrors infra/modules/postgres.bicep (Azure Database for PostgreSQL Flexible
// Server). RDS for PostgreSQL is the AWS managed equivalent. The instance lives
// only in the private subnets and is never publicly accessible; the ECS tasks
// reach it through the rds security group. TLS is enforced client-side via
// `sslmode=require` in DATABASE_URL (built in secrets.tf) — RDS presents a
// server certificate and the driver requires it.

// Subnet group across the private subnets (needs >= 2 AZs).
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnets"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${local.name_prefix}-db-subnets"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "${local.name_prefix}-postgres"
  engine         = "postgres"
  engine_version = var.postgres_version // Azure reference pins 18; see variables.tf

  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  multi_az                = var.db_multi_az
  backup_retention_period = var.db_backup_retention_days
  publicly_accessible     = false
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]

  deletion_protection       = var.db_deletion_protection
  skip_final_snapshot       = var.db_skip_final_snapshot
  final_snapshot_identifier = "${local.name_prefix}-postgres-final" // used only when skip_final_snapshot = false
  apply_immediately         = true

  tags = {
    Name = "${local.name_prefix}-postgres"
  }
}
