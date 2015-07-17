@isTest
private class DragDropFileUploadController_Test {

    static testMethod void unitTest() {
    	Account acc = new Account();
    	acc.Name = 'Test';
    	insert acc;
    	
        DragDropFileUploadController c = new DragDropFileUploadController(new ApexPages.StandardController(acc));
        String error = DragDropFileUploadController.saveFile('filename',null,null);
        System.assert(error!=null,'Error should have been thrown');
        error = DragDropFileUploadController.saveFile('filename','content',acc.Id);
        System.assert(error==null,'Error should have been null');
    }
}
