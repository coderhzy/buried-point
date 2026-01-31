// packages/cli/src/commands/validate.ts

import fs from 'fs';
import yaml from 'yaml';

interface PropertySchema {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

interface EventSchema {
  name: string;
  description?: string;
  type: string;
  module?: string;
  owner?: string;
  properties?: PropertySchema[];
}

interface SchemaConfig {
  version: string;
  events: EventSchema[];
}

const VALID_PROPERTY_TYPES = ['string', 'number', 'boolean', 'object', 'array'];
const VALID_EVENT_TYPES = ['page_view', 'click', 'expose', 'custom', 'error', 'performance'];

interface ValidationError {
  path: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  stats: {
    eventCount: number;
    propertyCount: number;
  };
}

export async function validate(schemaPath: string): Promise<void> {
  console.log(`Validating schema: ${schemaPath}\n`);

  // Check if file exists
  if (!fs.existsSync(schemaPath)) {
    console.error(`Error: Schema file not found: ${schemaPath}`);
    process.exit(1);
  }

  // Read and parse YAML
  let schema: SchemaConfig;
  try {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    schema = yaml.parse(content) as SchemaConfig;
  } catch (error) {
    console.error(`Error: Failed to parse YAML file`);
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  }

  const result = validateSchema(schema);

  // Output results
  if (result.errors.length > 0) {
    console.error('Validation Errors:');
    for (const error of result.errors) {
      console.error(`  [ERROR] ${error.path}: ${error.message}`);
    }
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.warn('Warnings:');
    for (const warning of result.warnings) {
      console.warn(`  [WARN] ${warning}`);
    }
    console.log('');
  }

  // Output stats
  console.log('Schema Statistics:');
  console.log(`  Events: ${result.stats.eventCount}`);
  console.log(`  Properties: ${result.stats.propertyCount}`);
  console.log('');

  // Final result
  if (result.valid) {
    console.log('Validation: PASSED');
    process.exit(0);
  } else {
    console.error(`Validation: FAILED (${result.errors.length} error(s))`);
    process.exit(1);
  }
}

function validateSchema(schema: SchemaConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  let propertyCount = 0;

  // Check version
  if (!schema.version) {
    errors.push({
      path: 'version',
      message: 'Missing required field "version"',
    });
  }

  // Check events array
  if (!schema.events) {
    errors.push({
      path: 'events',
      message: 'Missing required field "events"',
    });
    return {
      valid: false,
      errors,
      warnings,
      stats: { eventCount: 0, propertyCount: 0 },
    };
  }

  if (!Array.isArray(schema.events)) {
    errors.push({
      path: 'events',
      message: '"events" must be an array',
    });
    return {
      valid: false,
      errors,
      warnings,
      stats: { eventCount: 0, propertyCount: 0 },
    };
  }

  // Check for duplicate event names
  const eventNames = new Map<string, number>();
  for (let i = 0; i < schema.events.length; i++) {
    const event = schema.events[i];
    if (event.name) {
      const existing = eventNames.get(event.name);
      if (existing !== undefined) {
        errors.push({
          path: `events[${i}].name`,
          message: `Duplicate event name "${event.name}" (first defined at events[${existing}])`,
        });
      } else {
        eventNames.set(event.name, i);
      }
    }
  }

  // Validate each event
  for (let i = 0; i < schema.events.length; i++) {
    const event = schema.events[i];
    const eventPath = `events[${i}]`;

    // Check required fields
    if (!event.name) {
      errors.push({
        path: `${eventPath}.name`,
        message: 'Missing required field "name"',
      });
    } else if (!/^[a-z][a-z0-9_]*$/.test(event.name)) {
      warnings.push(
        `${eventPath}.name: Event name "${event.name}" should be snake_case (lowercase with underscores)`
      );
    }

    if (!event.type) {
      errors.push({
        path: `${eventPath}.type`,
        message: 'Missing required field "type"',
      });
    } else if (!VALID_EVENT_TYPES.includes(event.type)) {
      warnings.push(
        `${eventPath}.type: Unknown event type "${event.type}". ` +
          `Valid types are: ${VALID_EVENT_TYPES.join(', ')}`
      );
    }

    // Check description (warning only)
    if (!event.description) {
      warnings.push(`${eventPath}: Missing description for event "${event.name || 'unknown'}"`);
    }

    // Validate properties
    if (event.properties) {
      if (!Array.isArray(event.properties)) {
        errors.push({
          path: `${eventPath}.properties`,
          message: '"properties" must be an array',
        });
      } else {
        // Check for duplicate property names within this event
        const propNames = new Map<string, number>();
        for (let j = 0; j < event.properties.length; j++) {
          const prop = event.properties[j];
          if (prop.name) {
            const existing = propNames.get(prop.name);
            if (existing !== undefined) {
              errors.push({
                path: `${eventPath}.properties[${j}].name`,
                message: `Duplicate property name "${prop.name}" in event "${event.name || 'unknown'}"`,
              });
            } else {
              propNames.set(prop.name, j);
            }
          }
        }

        // Validate each property
        for (let j = 0; j < event.properties.length; j++) {
          const prop = event.properties[j];
          const propPath = `${eventPath}.properties[${j}]`;
          propertyCount++;

          if (!prop.name) {
            errors.push({
              path: `${propPath}.name`,
              message: 'Missing required field "name"',
            });
          }

          if (!prop.type) {
            errors.push({
              path: `${propPath}.type`,
              message: 'Missing required field "type"',
            });
          } else if (!VALID_PROPERTY_TYPES.includes(prop.type)) {
            errors.push({
              path: `${propPath}.type`,
              message: `Invalid property type "${prop.type}". ` +
                `Valid types are: ${VALID_PROPERTY_TYPES.join(', ')}`,
            });
          }

          // Check description (warning only)
          if (!prop.description) {
            warnings.push(
              `${propPath}: Missing description for property "${prop.name || 'unknown'}"`
            );
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      eventCount: schema.events.length,
      propertyCount,
    },
  };
}
