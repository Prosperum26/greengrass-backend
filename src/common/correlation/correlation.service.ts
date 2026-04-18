/**
 * Correlation ID Service
 *
 * WHY: Correlation IDs enable distributed tracing by:
 * 1. Tracking a single request across multiple services/microservices
 * 2. Grouping all logs for a single request together
 * 3. Debugging issues that span multiple layers of the application
 * 4. Making it easy to trace errors back to their source
 *
 * Uses cls-hooked (Continuation Local Storage) to maintain context
 * across async operations without manual passing.
 */

import { Injectable } from '@nestjs/common';
import { createNamespace, Namespace } from 'cls-hooked';
import { v4 as uuidv4 } from 'uuid';

const CORRELATION_NAMESPACE = 'correlation';
const CORRELATION_ID_KEY = 'correlationId';

@Injectable()
export class CorrelationService {
  private namespace: Namespace;

  constructor() {
    // Create or get the namespace for correlation IDs
    this.namespace = createNamespace(CORRELATION_NAMESPACE);
  }

  /**
   * Generate a new correlation ID
   */
  generateId(): string {
    return uuidv4();
  }

  /**
   * Run a function within a correlation context
   * This ensures the correlation ID is available throughout the async call chain
   */
  runWithId<T>(fn: () => T, correlationId?: string): T {
    const id = correlationId ?? this.generateId();

    return this.namespace.runAndReturn(() => {
      this.namespace.set(CORRELATION_ID_KEY, id);
      return fn();
    });
  }

  /**
   * Get the current correlation ID from the context
   * Returns undefined if not in a correlation context
   */
  getId(): string | undefined {
    return this.namespace.get(CORRELATION_ID_KEY);
  }

  /**
   * Set the correlation ID in the current context
   * Use with caution - prefer runWithId for proper scoping
   */
  setId(id: string): void {
    this.namespace.set(CORRELATION_ID_KEY, id);
  }
}
