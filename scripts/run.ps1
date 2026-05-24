pwsh -File .\scripts\sync-push-tag-fanxipan.ps1 `
  -RepoUrl "https://github.com/duongonix/fanxipan_repo.git" `
  -Branch "main" `
  -CommitMessage "chore: sync release prep" `
  -Tag "fanxipan-v1.0.2"