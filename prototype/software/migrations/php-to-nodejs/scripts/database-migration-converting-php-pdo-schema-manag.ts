// Input:  PHP migration files (Laravel/Phinx style)
// Output: Knex.js migration files

// migrations/20260217_create_users_table.ts
import { Knex } from 'knex';

// PHP equivalent:
// Schema::create('users', function (Blueprint $table) {
//     $table->id();
//     $table->string('name');
//     $table->string('email')->unique();
//     $table->string('password');
//     $table->timestamps();
// });

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('role', 50).defaultTo('user');
    table.boolean('active').defaultTo(true);
    table.timestamps(true, true);  // created_at, updated_at with defaults
  });

  // Add index — PHP: $table->index('email');
  await knex.schema.alterTable('users', (table) => {
    table.index(['active', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}

// Run migrations:
// npx knex migrate:latest --knexfile knexfile.ts
// PHP equivalent: php artisan migrate
