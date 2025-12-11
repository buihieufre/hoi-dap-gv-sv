/**
 * Answer Domain Model
 */

export class Answer {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly authorId: string,
    public readonly questionId: string,
    public readonly isPinned: boolean = false,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  pin(): Answer {
    return new Answer(
      this.id,
      this.content,
      this.authorId,
      this.questionId,
      true,
      this.createdAt,
      this.updatedAt
    );
  }

  unpin(): Answer {
    return new Answer(
      this.id,
      this.content,
      this.authorId,
      this.questionId,
      false,
      this.createdAt,
      this.updatedAt
    );
  }

  updateContent(newContent: string): Answer {
    return new Answer(
      this.id,
      newContent,
      this.authorId,
      this.questionId,
      this.isPinned,
      this.createdAt,
      this.updatedAt
    );
  }
}
