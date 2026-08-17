terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket = "tts-terraform-state-235494777438"
    key    = "text-to-speech/terraform.tfstate"
    region = "sa-east-1"
  }
}

provider "aws" {
  region = var.region
}