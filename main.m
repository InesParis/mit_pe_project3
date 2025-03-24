clear all

% Initialize DSM
n      = 10;   % # components
d      = 2;    % # dependencies per component
method = 'odeg';
DSM    = init_DSM(n,d,method);  

% Export DSM to JSON
DSM_json = jsonencode(DSM);
fileID = fopen('c:\Users\ines.paris\OneDrive - Global Alumni\VS CODE\mit_pe_project3\dsm_data.json', 'w');
fprintf(fileID, DSM_json);
fclose(fileID);

% Simulate DSM
% kmax   = 1000; % # of success to simulate
% tmax   = 1e8;  % max # of time steps to simulate
% [time,cost] = simulateRecipeModel(DSM,kmax,tmax);

% Plot
% fig_costEvolution

% GUI mode
if true
f    = openfig('RecipeGUI.fig');
data = guihandles(f); % Initialize data struct to contain handles for GUI.
data.n      = n;
data.d      = d;
data.method = method;
data.DSM    = DSM;
guidata(f, data);
end