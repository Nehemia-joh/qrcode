# shellcheck shell=bash
# Load KEY=VALUE lines from a .env file (no export of comments/blanks).
load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    [[ "$line" == *"="* ]] || continue
    export "$line"
  done < "$file"
}

load_project_env() {
  local root="$1"
  load_env_file "$root/.env"
  load_env_file "$root/legacy/qrcode/.env"
}
