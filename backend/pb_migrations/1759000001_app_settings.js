/// <reference path="../pb_data/types.d.ts" />

// Server settings kept in code so every instance is configured the same way.

migrate((app) => {
  const settings = app.settings();

  settings.meta.appName = 'اقدامات مانده';
  settings.meta.appURL = $os.getenv('PLANNER_APP_URL') || 'http://127.0.0.1:8090';

  // Built-in limiter (per IP): blunts password guessing and sign-up spam.
  settings.rateLimits.enabled = true;

  // Daily local backup at 03:30 server time, keep two weeks.
  settings.backups.cron = '30 3 * * *';
  settings.backups.cronMaxKeep = 14;

  app.save(settings);
});
