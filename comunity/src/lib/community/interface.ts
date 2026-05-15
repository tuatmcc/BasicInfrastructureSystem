import { z } from 'zod';
import { Role } from './type';

// --- Interface Definition ---

export interface CommunityProvider {


// role
  listUserRoles(userId: string): Promise<Role[]>;
}
