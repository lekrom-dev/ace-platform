/**
 * API client utilities for making HTTP requests
 */

import { ValidationError, handleError } from './errors'
import { logger } from './logger'

export interface ApiClientConfig {
  baseUrl?: string
  headers?: Record<string, string>
  timeout?: number
}

export interface RequestOptions extends RequestInit {
  timeout?: number
}

export class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private timeout: number

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || ''
    this.defaultHeaders = config.headers || {
      'Content-Type': 'application/json',
    }
    this.timeout = config.timeout || 30000
  }

  private async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const timeout = options.timeout || this.timeout

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      logger.debug(`API Request: ${method} ${url}`, {
        method,
        url,
        body: options.body,
      })

      const response = await fetch(url, {
        ...options,
        method,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        logger.error(`API Error: ${method} ${url}`, undefined, {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        })

        throw new ValidationError(`API request failed: ${response.statusText}`, {
          status: response.status,
          body: errorText,
        })
      }

      const data = await response.json()
      logger.debug(`API Response: ${method} ${url}`, { data })

      return data as T
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('API request timeout', error)
        throw new ValidationError('Request timeout')
      }

      throw handleError(error)
    }
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, options)
  }

  async post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, {
      ...options,
      body: JSON.stringify(body),
    })
  }

  async put<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, {
      ...options,
      body: JSON.stringify(body),
    })
  }

  async patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, {
      ...options,
      body: JSON.stringify(body),
    })
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options)
  }
}

export const apiClient = new ApiClient()
