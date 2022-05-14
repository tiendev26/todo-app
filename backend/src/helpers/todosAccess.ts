import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate';

const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('Todos data access')

// TODO: Implement the dataLayer logic
export class TodosAccess {

  constructor(
    private readonly docClient: DocumentClient = createDynamoDBClient(),
    private readonly todosTable = process.env.TODOS_TABLE,
    private readonly todoCreatedIndex = process.env.TODOS_CREATED_AT_INDEX
  ) {
  }

  async getAllTodos(userId: string): Promise<TodoItem[]> {
    logger.info('Getting all todos')

    const result = await this.docClient.query({
      TableName: this.todosTable,
      IndexName: this.todoCreatedIndex,
      KeyConditionExpression: 'userId = :pk',
      ExpressionAttributeValues: {
        ':pk': userId
      }
    }).promise()

    const items = result.Items
    return items as TodoItem[]
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
      UpdateExpression: "set #todo_name = :name, dueDate = :dueDate, done = :done",
      ExpressionAttributeNames: {
        '#todo_name': 'name',
      },
      ExpressionAttributeValues: {
        ":name": updateTodoItem.name,
        ":dueDate": updateTodoItem.dueDate,
        ":done": updateTodoItem.done
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