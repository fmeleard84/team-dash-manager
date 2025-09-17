module.exports = {
  apps: [
    {
      name: "team-dash-dev",
      script: "npm",
      args: "run dev",
      cwd: "/opt/team-dash-manager",
      env: {
        NODE_ENV: "development",
        PORT: 8081
      },
      watch: false,
      max_memory_restart: "1G",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/opt/team-dash-manager/logs/dev-error.log",
      out_file: "/opt/team-dash-manager/logs/dev-out.log",
      merge_logs: true
    },
    {
      name: "team-dash-prod",
      script: "npm",
      args: "run preview",
      cwd: "/opt/team-dash-manager-prod",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      watch: false,
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "2G",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/opt/team-dash-manager-prod/logs/prod-error.log",
      out_file: "/opt/team-dash-manager-prod/logs/prod-out.log",
      merge_logs: true,
      autorestart: true
    }
  ]
};