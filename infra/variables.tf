variable "region" {
  type    = string
  default = "ca-central-1"
}

variable "project" {
  type    = string
  default = "nutrivision"
}

variable "github_repo" {
  type        = string
  description = "owner/repo, e.g. zenprime/nutrivision"
}

variable "frontend_domain" {
  type    = string
  default = ""
}

variable "instance_type" {
  type    = string
  default = "t3.large"
}
