import { History } from 'history'
import update from 'immutability-helper'
import * as React from 'react'
import {
  Button,
  Checkbox,
  Divider,
  Grid,
  Header,
  Icon,
  Input,
  Image,
  Loader,
  Dropdown,
  DropdownProps
} from 'semantic-ui-react'

import { createTodo, deleteTodo, getTodos, getTodosByDueDate, patchTodo } from '../api/todos-api'
import Auth from '../auth/Auth'
import { Todo } from '../types/Todo'

interface TodosProps {
  auth: Auth
  history: History
}

interface TodosState {
  todos: Todo[]
  newTodoName: string
  newTodoPriority: string
  newDueDate: string
  loadingTodos: boolean
  pageNext: string | null
  sort: string | null
}

const options = [
  { key: 1, text: 'Low', value: 'Low' },
  { key: 2, text: 'Medium', value: 'Medium' },
  { key: 3, text: 'High', value: 'High' }
]

export class Todos extends React.PureComponent<TodosProps, TodosState> {
  state: TodosState = {
    todos: [],
    newTodoName: '',
    newTodoPriority: 'Medium', //default
    newDueDate: new Date().toISOString().slice(0, 10), //today
    pageNext: null,
    sort: null,
    loadingTodos: true
  }

  handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ newTodoName: event.target.value })
  }

  handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ newDueDate: event.target.value })
  }

  handlePriorityChange = (
    event: React.SyntheticEvent<HTMLElement, Event>,
    data: DropdownProps
  ) => {
    const priority = data.value as string
    this.setState({ newTodoPriority: priority })
  }

  todosOnPage = async (key?: string | null) => {
    const { todos, sort } = this.state
    let resp

    if (!!sort) {
      resp = (key === undefined) ? await getTodosByDueDate(this.props.auth.getIdToken(), sort as string ) : await getTodosByDueDate(this.props.auth.getIdToken(), sort as string , key)
    } else {
      resp = (key === undefined) ? await getTodos(this.props.auth.getIdToken()) : await getTodos(this.props.auth.getIdToken(), key)
    }

    const { items, nextKey } = resp
    this.setState({
      todos: todos.concat(items),
      loadingTodos: false,
      pageNext: nextKey
    })
  }

  onNextPage = () => {
    const { pageNext } = this.state

    this.setState({ loadingTodos: true })
    this.todosOnPage(pageNext)
  }

  onEditButtonClick = (todoId: string) => {
    this.props.history.push(`/todos/${todoId}/edit`)
  }

  handleSort = async () => {
    const { sort } = this.state;
    this.setState({ loadingTodos: true })
    const newSort = sort === null || sort === 'desc' ? 'asc' : 'desc'
    const resp = await getTodosByDueDate(this.props.auth.getIdToken(), newSort)
    const { items, nextKey } = resp;

    this.setState({
      todos: items,
      loadingTodos: false,
      pageNext: nextKey,
      sort: newSort
    })
  }

  onTodoCreate = async (event: React.ChangeEvent<HTMLButtonElement>) => {
    try {
      await createTodo(this.props.auth.getIdToken(), {
        name: this.state.newTodoName,
        priority: this.state.newTodoPriority,
        dueDate: this.state.newDueDate
      })
      this.setState({
        todos: [],
        newTodoName: '',
        newTodoPriority: 'Medium',
        newDueDate: new Date().toISOString().slice(0, 10), //today
      })
      this.todosOnPage();
      alert('Create todo successfully!')
    } catch {
      alert('Todo creation failed, please check your input data')
    }
  }

  onTodoDelete = async (todoId: string) => {
    try {
      await deleteTodo(this.props.auth.getIdToken(), todoId)
      this.setState({
        todos: this.state.todos.filter((todo) => todo.todoId !== todoId)
      })
      alert('Delete todo successfully!')
    } catch {
      alert('Todo deletion failed')
    }
  }

  onTodoCheck = async (pos: number) => {
    try {
      const todo = this.state.todos[pos]
      await patchTodo(this.props.auth.getIdToken(), todo.todoId, {
        name: todo.name,
        dueDate: todo.dueDate,
        priority: todo.priority,
        done: !todo.done
      })
      this.setState({
        todos: update(this.state.todos, {
          [pos]: { done: { $set: !todo.done } }
        })
      })
    } catch {
      alert('Update Todo done is failed')
    }
  }

  async componentDidMount() {
    try {
      this.todosOnPage();
    } catch (e) {
      let errorMessage = "Failed to fetch todos";
      if(e instanceof Error) {
      	errorMessage = e.message;
      }
      alert(`Failed to fetch todos: ${errorMessage}`)
    }
  }

  render() {
    return (
      <div>
        <Header as="h1">TODOs</Header>

        {this.renderCreateTodoInput()}
        {this.renderTodos()}
      </div>
    )
  }

  renderCreateTodoInput() {
    return (
      <Grid>
        <Grid.Row className="flex">
          <Grid.Column className="priority">
            <span>Priority: </span>
            <Dropdown
              onChange={this.handlePriorityChange}
              options={options}
              placeholder="Priority"
              selection
              compact
              value={this.state.newTodoPriority}
            />
          </Grid.Column>
          <Grid.Column className="priority">
            <span>Due date: </span>
            <Input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={this.state.newDueDate}
              onChange={this.handleDateChange}
            />
          </Grid.Column>
          <Grid.Column>
            <Input
              action={{
                color: 'teal',
                labelPosition: 'left',
                icon: 'add',
                content: 'Add',
                onClick: this.onTodoCreate
              }}
              fluid
              value={this.state.newTodoName}
              placeholder="Add new task"
              onChange={this.handleNameChange}
            />
          </Grid.Column>
        </Grid.Row>
        <Grid.Row>
          <Grid.Column width={16}>
            <Divider />
          </Grid.Column>
        </Grid.Row>
      </Grid>
    )
  }

  renderTodos() {
    if (this.state.loadingTodos) {
      return this.renderLoading()
    }

    if (this.state.todos.length > 0) {
      return this.renderTodosList()
    }
  }

  renderLoading() {
    return (
      <Grid.Row>
        <Loader indeterminate active inline="centered">
          Loading TODOs
        </Loader>
      </Grid.Row>
    )
  }

  renderEmptyTodo() {
    return (
      <Grid.Row>
        <Loader indeterminate active inline="centered">
          Loading TODOs
        </Loader>
      </Grid.Row>
    )
  }

  renderTodosList() {
    const {todos, pageNext, sort} = this.state;
    return (
      <Grid padded>
        <Grid.Row className='head-table'>
          <Grid.Column width={1} verticalAlign="middle">
            Done
          </Grid.Column>
          <Grid.Column width={8} verticalAlign="middle">
            Name
          </Grid.Column>
          <Grid.Column width={2} verticalAlign="middle">
            Priority
          </Grid.Column>
          <Grid.Column
            width={3}
            floated="right"
            className='sort-column'
            onClick={() => this.handleSort()}
          >
            Due Date
            {sort === 'asc' ? (
              <Icon name="angle down" />
            ) : (
              <Icon name="angle up" />
            )}
          </Grid.Column>
          <Grid.Column width={2} floated="right">
            Actions
          </Grid.Column>
          <Grid.Column width={16}>
            <Divider />
          </Grid.Column>
        </Grid.Row>

        {todos.map((todo, pos) => {
          return (
            <Grid.Row
              key={todo.todoId}
              className={todo.done ? 'task-done' : ''}
            >
              <Grid.Column width={1} verticalAlign="middle">
                <Checkbox
                  onChange={() => this.onTodoCheck(pos)}
                  checked={todo.done}
                />
              </Grid.Column>
              <Grid.Column width={8} verticalAlign="middle">
                {todo.name}
              </Grid.Column>
              <Grid.Column width={2} verticalAlign="middle">
                {todo.priority}
              </Grid.Column>
              <Grid.Column width={3} floated="right" verticalAlign="middle">
                {todo.dueDate}
              </Grid.Column>
              <Grid.Column width={1} floated="right">
                <Button
                  icon
                  color="blue"
                  onClick={() => this.onEditButtonClick(todo.todoId)}
                >
                  <Icon name="pencil" />
                </Button>
              </Grid.Column>
              <Grid.Column width={1} floated="right">
                <Button
                  icon
                  color="red"
                  onClick={() => this.onTodoDelete(todo.todoId)}
                >
                  <Icon name="delete" />
                </Button>
              </Grid.Column>
              {todo.attachmentUrl && (
                <Image src={todo.attachmentUrl} size="small" wrapped />
              )}
              <Grid.Column width={16}>
                <Divider />
              </Grid.Column>
            </Grid.Row>
          )
        })}

        {!!pageNext && (
          <Grid.Row>
            <Grid.Column width={16} className="pagination-custom">
              <Button inverted color="orange" onClick={() => this.onNextPage()}>
                Load more ...
              </Button>
            </Grid.Column>
          </Grid.Row>
        )}
      </Grid>
    )
  }
}
