import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import * as middy from 'middy'
import { cors, httpErrorHandler } from 'middy/middlewares'

import { getAllTodosByDueDate } from '../../helpers/todos'
import { encodeNextKey, getUserId } from '../utils';

// TODO: Get all TODO items for a current user
export const handler = middy(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Write your code here
    const userId = getUserId(event)
    try {
      const todos = await getAllTodosByDueDate(userId, event)
      return {
        statusCode: 200,
        body: JSON.stringify({
          items: todos.Items,
          nextKey: encodeNextKey(todos.LastEvaluatedKey)
        })
      }
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid parameters'
        })
      }
    }
  });
handler
.use(httpErrorHandler())
.use(
  cors({
    credentials: true
  })
)
