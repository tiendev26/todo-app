import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate';
import { getPathParameter, parseLimitParameter, parseNextKeyParameter } from '../lambda/utils'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { PromiseResult } from 'aws-sdk/lib/request'

const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('Todos data access')

// TODO: Implement the dataLayer logic
export class TodosAccess {

  constructor(
    private readonly docClient: DocumentClient = createDynamoDBClient(),
    private readonly todosTable = process.env.TODOS_TABLE,
    private readonly todoCreatedIndex = process.env.TODOS_CREATED_AT_INDEX,
    private readonly todoDueDateIndex = process.env.TODOS_DUE_DATE_INDEX
  ) {
  }

  async getAllTodos(userId: string, event: APIGatewayProxyEvent): Promise<PromiseResult<AWS.DynamoDB.DocumentClient.QueryOutput, AWS.AWSError>> {
    logger.info('Getting all todos')

    // Parse query parameters
    let nextKey = parseNextKeyParameter(event)
    let limit = parseLimitParameter(event) || 5

    let queryParams: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: this.todosTable,
      IndexName: this.todoCreatedIndex,
      KeyConditionExpression: 'userId = :pk',
      ExpressionAttributeValues: {
        ':pk': userId
      },
      Limit: limit
    }

    if (nextKey) { 
      queryParams = { 
        ...queryParams, 
        ExclusiveStartKey: nextKey
      }
    }

    const result = await this.docClient.query(queryParams).promise()

    return result
  }

  async getAllTodosByDueDate(userId: string, event: APIGatewayProxyEvent): Promise<PromiseResult<AWS.DynamoDB.DocumentClient.QueryOutput, AWS.AWSError>> {
    logger.info('Getting all todos by due date')

    // Parse query parameters
    let sortBy = getPathParameter(event, 'sortby')
    let nextKey = parseNextKeyParameter(event)
    let limit = parseLimitParameter(event) || 5

    logger.info(`Sort by: ${sortBy}`)
    let queryParams: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: this.todosTable,
      IndexName: this.todoDueDateIndex,
      KeyConditionExpression: 'userId = :pk',
      ExpressionAttributeValues: {
        ':pk': userId
      },
      Limit: limit,
      ScanIndexForward: (sortBy === 'asc' ? true : ((sortBy === 'desc') ? false : true))
    }

    if (nextKey) { 
      queryParams = { 
        ...queryParams, 
        ExclusiveStartKey: nextKey
      }
    }
    const result = await this.docClient.query(queryParams).promise()

    return result
  }

  async createTodo(todoItem: TodoItem): Promise<TodoItem> {
    logger.info('Create new todo')

    await this.docClient.put({
      TableName: this.todosTable,
      Item: todoItem
    }).promise()

    return todoItem
  }

  async updateTodo(todoId: String, userId: String, updateTodoItem: TodoUpdate): Promise<TodoUpdate> {
    logger.info('Update todo')

    await this.docClient.update({
      TableName: this.todosTable,
      Key: {
        todoId: todoId,
        userId: userId
      },
      UpdateExpression: "set #todo_name = :name, dueDate = :dueDate, done = :done, priority = :priority",
      ExpressionAttributeNames: {
        '#todo_name': 'name',
      },
      ExpressionAttributeValues: {
        ":name": updateTodoItem.name,
        ":dueDate": updateTodoItem.dueDate,
        ":done": updateTodoItem.done,
        ":priority": updateTodoItem.priority
      }
    }).promise()

    return updateTodoItem
  }

  async deleteTodo(todoId: String, userId: String) {
    logger.info('Delete todo')

    await this.docClient.delete({
      TableName: this.todosTable,
      Key: {
        todoId: todoId,
        userId: userId
      }
    }, (err) => {
      if (err) {
        throw new Error("")
      }
    }).promise()
  }

}

function createDynamoDBClient() {
  if (process.env.IS_OFFLINE) {
    logger.info('Creating a local DynamoDB instance')

    return new XAWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000'
    })
  }

  return new XAWS.DynamoDB.DocumentClient()
}