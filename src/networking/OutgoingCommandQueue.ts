import { GameCommand } from '../game/commands/GameCommand';

export class OutgoingCommandQueue {
  private queue: GameCommand[] = [];
  private onCommandDispatched?: (command: GameCommand) => void;
  private logToConsole: boolean;

  constructor(options?: { logToConsole?: boolean; onCommandDispatched?: (cmd: GameCommand) => void }) {
    this.logToConsole = options?.logToConsole ?? true;
    this.onCommandDispatched = options?.onCommandDispatched;
  }

  public setDispatcher(dispatcher: (cmd: GameCommand) => void): void {
    this.onCommandDispatched = dispatcher;
  }

  public enqueue(command: GameCommand): void {
    this.queue.push(command);

    if (this.logToConsole) {
      console.log(
        '%c[OUTGOING COMMAND]',
        'color: #00e5ff; font-weight: bold; background: #002b36; padding: 2px 6px; border-radius: 4px;',
        command
      );
    }

    // In local driver mode, we dequeue immediately and pass it to the driver
    const dequeued = this.dequeue();
    if (dequeued && this.onCommandDispatched) {
      this.onCommandDispatched(dequeued);
    }
  }

  public peek(): GameCommand | undefined {
    return this.queue[0];
  }

  public dequeue(): GameCommand | undefined {
    return this.queue.shift();
  }

  public clear(): void {
    this.queue = [];
  }

  public size(): number {
    return this.queue.length;
  }
}
