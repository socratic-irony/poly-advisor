import { describe, expect, it } from 'vitest';
import { guidanceSearchTool } from './guidanceTool';

describe('guidance search tool', () => {
  it('lets the model choose the PHIL, CLA, or combined reference', () => {
    expect(guidanceSearchTool).toMatchObject({
      type: 'function',
      name: 'search_advising_guidance',
      strict: true,
    });

    expect(guidanceSearchTool.parameters.properties.document.enum).toEqual([
      'phil',
      'cla',
      'both',
    ]);
    expect(guidanceSearchTool.parameters.required).toEqual(['document', 'query']);
  });
});
