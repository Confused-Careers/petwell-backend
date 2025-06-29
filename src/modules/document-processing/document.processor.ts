import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { UserPetService } from '../user-pet/user-pet.service';

@Processor('document-processing')
export class DocumentProcessor {
  constructor(private userPetService: UserPetService) {}

  @Process('process-documents')
  async handleDocumentJob(job: Job) {
    try {
      const result = await this.userPetService.processDocumentsJob(job.data);
      return result;
    } catch (error) {
      console.error('Error processing document job:', error);
      throw error;
    }
  }
}